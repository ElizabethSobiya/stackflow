package com.stackflow.inventory.order.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.common.exception.BusinessRuleException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class OrderTest {

    @Test
    void totalIsTheSumOfItsLines() {
        Order order = draftOrder();
        order.addLine(product(1L, "SKU-1", "19.99"), 3);
        order.addLine(product(2L, "SKU-2", "5.00"), 2);

        assertThat(order.getTotalAmount()).isEqualByComparingTo("69.97");
        assertThat(order.totalUnits()).isEqualTo(5);
    }

    @Test
    void mergesRepeatedProductsIntoOneLine() {
        Order order = draftOrder();
        Product product = product(1L, "SKU-1", "10.00");
        order.addLine(product, 2);
        order.addLine(product, 3);

        assertThat(order.getItems()).hasSize(1);
        assertThat(order.getItems().get(0).getQuantity()).isEqualTo(5);
        assertThat(order.getTotalAmount()).isEqualByComparingTo("50.00");
    }

    @Test
    void recordsEveryTransitionInHistory() {
        Order order = draftOrder();
        order.transitionTo(OrderStatus.CONFIRMED, 7L, "Stock reserved");

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(order.getStatusHistory()).hasSize(2);
        OrderStatusHistory last = order.getStatusHistory().get(1);
        assertThat(last.getFromStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(last.getToStatus()).isEqualTo(OrderStatus.CONFIRMED);
        assertThat(last.getChangedBy()).isEqualTo(7L);
    }

    @Test
    void rejectsIllegalTransitionsAndLeavesStateUntouched() {
        Order order = draftOrder();

        assertThatThrownBy(() -> order.transitionTo(OrderStatus.DELIVERED, 1L, null))
                .isInstanceOf(InvalidStatusTransitionException.class);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        assertThat(order.getStatusHistory()).hasSize(1);
    }

    @Test
    void onlyPendingOrdersAcceptNewLines() {
        Order order = draftOrder();
        order.transitionTo(OrderStatus.CONFIRMED, 1L, null);

        assertThatThrownBy(() -> order.addLine(product(1L, "SKU-1", "1.00"), 1))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void itemsAreNotMutableThroughTheGetter() {
        Order order = draftOrder();
        assertThatThrownBy(() -> order.getItems().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    private static Order draftOrder() {
        return Order.draft("ORD-20260101-TEST", "Acme Corp", "buyer@acme.example", null);
    }

    private static Product product(Long id, String sku, String price) {
        Product product = Product.builder()
                .name("Product " + sku)
                .category("Test")
                .sku(sku)
                .price(new BigDecimal(price))
                .build();
        ReflectionTestUtils.setField(product, "id", id);
        return product;
    }
}
