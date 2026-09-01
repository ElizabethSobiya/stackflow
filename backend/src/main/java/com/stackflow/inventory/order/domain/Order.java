package com.stackflow.inventory.order.domain;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.common.domain.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;

/**
 * The order aggregate: header, its lines and its status history.
 *
 * <p>Everything that can change about an order goes through a method on this class, so the
 * invariants — the total always matches the lines, no status change happens without a history row,
 * illegal transitions are impossible — hold no matter which service calls it.
 */
@Entity
@Getter
@Table(name = "orders")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Order extends BaseEntity {

    @Column(name = "order_number", nullable = false, unique = true, length = 32)
    private String orderNumber;

    @Column(name = "customer_name", nullable = false, length = 160)
    private String customerName;

    @Column(name = "customer_email", length = 255)
    private String customerEmail;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(length = 500)
    private String notes;

    @CreatedBy
    @Column(name = "created_by")
    private Long createdBy;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private final List<OrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private final List<OrderStatusHistory> statusHistory = new ArrayList<>();

    private Order(String orderNumber, String customerName, String customerEmail, String notes) {
        this.orderNumber = orderNumber;
        this.customerName = customerName;
        this.customerEmail = customerEmail;
        this.notes = notes;
        this.status = OrderStatus.PENDING;
        this.totalAmount = BigDecimal.ZERO;
    }

    /** Every order starts as PENDING with its creation recorded in the history. */
    public static Order draft(String orderNumber, String customerName, String customerEmail, String notes) {
        Order order = new Order(orderNumber, customerName, customerEmail, notes);
        order.statusHistory.add(new OrderStatusHistory(order, null, OrderStatus.PENDING, null, "Order created"));
        return order;
    }

    /**
     * Adds a line, merging duplicates of the same product so stock deduction sees one row per
     * product.
     */
    public void addLine(Product product, int quantity) {
        requireEditable();
        items.stream()
                .filter(item -> item.getProduct().getId().equals(product.getId()))
                .findFirst()
                .ifPresentOrElse(existing -> existing.addQuantity(quantity), () -> {
                    OrderItem item = OrderItem.builder()
                            .product(product)
                            .quantity(quantity)
                            .build();
                    item.assignTo(this);
                    items.add(item);
                });
        recalculateTotal();
    }

    /**
     * Moves the order to {@code target}, recording who did it and why.
     *
     * @throws InvalidStatusTransitionException if the move is not allowed from the current status
     */
    public void transitionTo(OrderStatus target, Long actorId, String note) {
        if (!status.canTransitionTo(target)) {
            throw new InvalidStatusTransitionException(status, target);
        }
        OrderStatus previous = status;
        this.status = target;
        statusHistory.add(new OrderStatusHistory(this, previous, target, actorId, note));
    }

    public List<OrderItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public List<OrderStatusHistory> getStatusHistory() {
        return Collections.unmodifiableList(statusHistory);
    }

    public int totalUnits() {
        return items.stream().mapToInt(OrderItem::getQuantity).sum();
    }

    private void recalculateTotal() {
        this.totalAmount = items.stream()
                .map(OrderItem::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void requireEditable() {
        if (status != OrderStatus.PENDING) {
            throw new com.stackflow.inventory.common.exception.BusinessRuleException(
                    "Only PENDING orders can be modified; this order is " + status);
        }
    }
}
