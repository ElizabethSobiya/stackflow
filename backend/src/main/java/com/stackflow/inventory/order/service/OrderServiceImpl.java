package com.stackflow.inventory.order.service;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.catalog.service.ProductService;
import com.stackflow.inventory.common.exception.BusinessRuleException;
import com.stackflow.inventory.common.exception.ConflictException;
import com.stackflow.inventory.common.exception.ResourceNotFoundException;
import com.stackflow.inventory.common.support.OptimisticRetry;
import com.stackflow.inventory.common.support.Specifications;
import com.stackflow.inventory.order.domain.Order;
import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.dto.CreateOrderRequest;
import com.stackflow.inventory.order.dto.OrderItemRequest;
import com.stackflow.inventory.order.dto.OrderResponse;
import com.stackflow.inventory.order.dto.OrderSearchCriteria;
import com.stackflow.inventory.order.dto.OrderSummaryResponse;
import com.stackflow.inventory.order.repository.OrderRepository;
import com.stackflow.inventory.order.repository.OrderSpecifications;
import com.stackflow.inventory.stock.service.StockLine;
import com.stackflow.inventory.stock.service.StockService;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Order lifecycle and its stock side effects.
 *
 * <p>Stock is committed at CONFIRMED — not at creation — so a pending order never blocks inventory,
 * and cancelling a confirmed order gives the units back. Both directions run inside the same
 * transaction as the status change, so an order can never end up confirmed with stock un-deducted.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderServiceImpl implements OrderService {

    private static final int ORDER_NUMBER_ATTEMPTS = 5;
    private static final int STATUS_CHANGE_ATTEMPTS = 3;

    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final StockService stockService;
    private final OrderNumberGenerator orderNumberGenerator;
    private final TransactionTemplate transactionTemplate;

    @Override
    @Transactional
    public OrderResponse create(CreateOrderRequest request) {
        Map<Long, Product> products = loadProducts(request.items());

        Order order = Order.draft(
                nextOrderNumber(), request.customerName().trim(), request.customerEmail(), request.notes());
        for (OrderItemRequest item : request.items()) {
            order.addLine(products.get(item.productId()), item.quantity());
        }

        Order saved = orderRepository.save(order);
        log.info("Created order {} with {} line(s), total {}", saved.getOrderNumber(), saved.getItems().size(),
                saved.getTotalAmount());
        return OrderResponse.from(saved);
    }

    @Override
    public OrderResponse getById(Long id) {
        Order order = orderRepository
                .findWithItemsById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", id));
        // Touches the lazy history collection inside the read transaction so the DTO can map it.
        order.getStatusHistory().size();
        return OrderResponse.from(order);
    }

    @Override
    public Page<OrderSummaryResponse> search(OrderSearchCriteria criteria, Pageable pageable) {
        Specification<Order> specification = Specifications.allOf(
                OrderSpecifications.matchesText(criteria.search()),
                OrderSpecifications.hasStatus(criteria.status()),
                OrderSpecifications.createdAfter(criteria.from()),
                OrderSpecifications.createdBefore(criteria.to()),
                OrderSpecifications.createdBy(criteria.createdBy()));

        Page<Order> page = orderRepository.findAll(specification, pageable);
        Map<Long, Long> unitsByOrder = unitCounts(page.getContent());
        return page.map(order -> OrderSummaryResponse.from(order, unitsByOrder.getOrDefault(order.getId(), 0L)));
    }

    /**
     * Runs outside any inherited transaction ({@code NOT_SUPPORTED}) so that each retry attempt can
     * open a fresh one — a transaction that lost an optimistic-locking race is already doomed, and
     * the class-level read-only transaction would suppress the flush entirely.
     *
     * <p>Inside one attempt, the status change and its stock movement share a single transaction, so
     * the two can never diverge.
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public OrderResponse changeStatus(Long orderId, OrderStatus target, String note, Long actorId) {
        return OptimisticRetry.execute(
                "order-status-change",
                STATUS_CHANGE_ATTEMPTS,
                () -> transactionTemplate.execute(status -> applyStatusChange(orderId, target, note, actorId)));
    }

    private OrderResponse applyStatusChange(Long orderId, OrderStatus target, String note, Long actorId) {
        Order order = orderRepository
                .findWithItemsById(orderId)
                .orElseThrow(() -> ResourceNotFoundException.of("Order", orderId));

        OrderStatus previous = order.getStatus();
        // Validate before touching stock: an illegal transition must not move a single unit.
        order.transitionTo(target, actorId, note);

        if (target == OrderStatus.CONFIRMED) {
            stockService.deductForOrder(order.getId(), stockLines(order));
        } else if (target == OrderStatus.CANCELLED && previous.holdsStock()) {
            stockService.restoreForOrder(order.getId(), stockLines(order));
        }

        log.info("Order {} moved {} -> {}", order.getOrderNumber(), previous, target);
        return OrderResponse.from(order);
    }

    private List<StockLine> stockLines(Order order) {
        return order.getItems().stream()
                .map(item -> new StockLine(item.getProduct().getId(), item.getQuantity()))
                .toList();
    }

    private Map<Long, Product> loadProducts(List<OrderItemRequest> items) {
        List<Long> productIds = items.stream().map(OrderItemRequest::productId).distinct().toList();
        Map<Long, Product> products = productService.getEntities(productIds);

        List<Long> missing = productIds.stream().filter(id -> !products.containsKey(id)).toList();
        if (!missing.isEmpty()) {
            throw ResourceNotFoundException.of("Product", missing);
        }
        List<String> inactive = products.values().stream()
                .filter(product -> !product.isActive())
                .map(Product::getSku)
                .toList();
        if (!inactive.isEmpty()) {
            throw new BusinessRuleException("These products are no longer available: " + inactive);
        }
        return products;
    }

    private Map<Long, Long> unitCounts(List<Order> orders) {
        if (orders.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = orders.stream().map(Order::getId).toList();
        return orderRepository.countUnitsByOrderIds(ids).stream()
                .collect(Collectors.toMap(
                        OrderRepository.OrderUnitCount::getOrderId, OrderRepository.OrderUnitCount::getUnits));
    }

    private String nextOrderNumber() {
        for (int attempt = 0; attempt < ORDER_NUMBER_ATTEMPTS; attempt++) {
            String candidate = orderNumberGenerator.next();
            if (!orderRepository.existsByOrderNumber(candidate)) {
                return candidate;
            }
        }
        throw new ConflictException("Could not allocate a unique order number, please retry");
    }
}
