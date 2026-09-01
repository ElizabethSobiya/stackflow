package com.stackflow.inventory.order.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.catalog.service.ProductService;
import com.stackflow.inventory.common.exception.BusinessRuleException;
import com.stackflow.inventory.order.domain.InvalidStatusTransitionException;
import com.stackflow.inventory.order.domain.Order;
import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.dto.CreateOrderRequest;
import com.stackflow.inventory.order.dto.OrderItemRequest;
import com.stackflow.inventory.order.dto.OrderResponse;
import com.stackflow.inventory.order.repository.OrderRepository;
import com.stackflow.inventory.stock.service.StockLine;
import com.stackflow.inventory.stock.service.StockService;
import com.stackflow.inventory.support.TransactionTemplates;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OrderServiceImplTest {

    private static final Long ORDER_ID = 100L;
    private static final Long ACTOR_ID = 9L;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductService productService;

    @Mock
    private StockService stockService;

    @Mock
    private OrderNumberGenerator orderNumberGenerator;

    private OrderServiceImpl orderService;

    @BeforeEach
    void setUp() {
        orderService = new OrderServiceImpl(
                orderRepository,
                productService,
                stockService,
                orderNumberGenerator,
                TransactionTemplates.passthrough());
        when(orderNumberGenerator.next()).thenReturn("ORD-20260101-AAAA");
        when(orderRepository.existsByOrderNumber(anyString())).thenReturn(false);
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("creating an order prices lines from the catalog and starts in PENDING")
    void createPricesFromCatalog() {
        Product laptop = product(1L, "SKU-LAPTOP", "1000.00", true);
        Product mouse = product(2L, "SKU-MOUSE", "25.50", true);
        when(productService.getEntities(any())).thenReturn(Map.of(1L, laptop, 2L, mouse));

        OrderResponse response = orderService.create(new CreateOrderRequest(
                "Acme", "buyer@acme.example", null,
                List.of(new OrderItemRequest(1L, 2), new OrderItemRequest(2L, 4))));

        assertThat(response.status()).isEqualTo(OrderStatus.PENDING);
        assertThat(response.totalAmount()).isEqualByComparingTo("2102.00");
        assertThat(response.items()).hasSize(2);
        // Creating an order must not touch stock — units are committed at confirmation.
        verifyNoInteractions(stockService);
    }

    @Test
    void createRejectsInactiveProducts() {
        when(productService.getEntities(any())).thenReturn(Map.of(1L, product(1L, "SKU-OLD", "10.00", false)));

        assertThatThrownBy(() -> orderService.create(new CreateOrderRequest(
                        "Acme", null, null, List.of(new OrderItemRequest(1L, 1)))))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no longer available");
    }

    @Test
    @DisplayName("confirming an order deducts exactly the ordered units")
    void confirmDeductsStock() {
        Order order = persistedOrder(OrderStatus.PENDING, product(1L, "SKU-LAPTOP", "1000.00", true), 3);
        when(orderRepository.findWithItemsById(ORDER_ID)).thenReturn(Optional.of(order));

        OrderResponse response = orderService.changeStatus(ORDER_ID, OrderStatus.CONFIRMED, "ok", ACTOR_ID);

        assertThat(response.status()).isEqualTo(OrderStatus.CONFIRMED);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<StockLine>> captor = ArgumentCaptor.forClass(List.class);
        verify(stockService).deductForOrder(eq(ORDER_ID), captor.capture());
        assertThat(captor.getValue()).containsExactly(new StockLine(1L, 3));
    }

    @Test
    @DisplayName("cancelling a confirmed order returns the units to stock")
    void cancelAfterConfirmRestoresStock() {
        Order order = persistedOrder(OrderStatus.CONFIRMED, product(1L, "SKU-LAPTOP", "1000.00", true), 2);
        when(orderRepository.findWithItemsById(ORDER_ID)).thenReturn(Optional.of(order));

        orderService.changeStatus(ORDER_ID, OrderStatus.CANCELLED, "customer changed their mind", ACTOR_ID);

        verify(stockService).restoreForOrder(eq(ORDER_ID), any());
    }

    @Test
    @DisplayName("cancelling a pending order does not touch stock — none was ever taken")
    void cancelPendingDoesNotRestoreStock() {
        Order order = persistedOrder(OrderStatus.PENDING, product(1L, "SKU-LAPTOP", "1000.00", true), 2);
        when(orderRepository.findWithItemsById(ORDER_ID)).thenReturn(Optional.of(order));

        orderService.changeStatus(ORDER_ID, OrderStatus.CANCELLED, null, ACTOR_ID);

        verify(stockService, never()).restoreForOrder(anyLong(), any());
        verify(stockService, never()).deductForOrder(anyLong(), any());
    }

    @Test
    @DisplayName("an illegal transition is rejected before any stock is moved")
    void illegalTransitionLeavesStockAlone() {
        Order order = persistedOrder(OrderStatus.DELIVERED, product(1L, "SKU-LAPTOP", "1000.00", true), 1);
        when(orderRepository.findWithItemsById(ORDER_ID)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.changeStatus(ORDER_ID, OrderStatus.PENDING, null, ACTOR_ID))
                .isInstanceOf(InvalidStatusTransitionException.class);

        verifyNoInteractions(stockService);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.DELIVERED);
    }

    private static Order persistedOrder(OrderStatus status, Product product, int quantity) {
        Order order = Order.draft("ORD-20260101-AAAA", "Acme", null, null);
        order.addLine(product, quantity);
        if (status == OrderStatus.CONFIRMED || status == OrderStatus.SHIPPED || status == OrderStatus.DELIVERED) {
            order.transitionTo(OrderStatus.CONFIRMED, ACTOR_ID, null);
        }
        if (status == OrderStatus.SHIPPED || status == OrderStatus.DELIVERED) {
            order.transitionTo(OrderStatus.SHIPPED, ACTOR_ID, null);
        }
        if (status == OrderStatus.DELIVERED) {
            order.transitionTo(OrderStatus.DELIVERED, ACTOR_ID, null);
        }
        ReflectionTestUtils.setField(order, "id", ORDER_ID);
        return order;
    }

    private static Product product(Long id, String sku, String price, boolean active) {
        Product product = Product.builder()
                .name("Product " + sku)
                .category("Test")
                .sku(sku)
                .price(new BigDecimal(price))
                .build();
        ReflectionTestUtils.setField(product, "id", id);
        if (!active) {
            product.deactivate();
        }
        return product;
    }
}
