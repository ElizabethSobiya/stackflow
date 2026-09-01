package com.stackflow.inventory.order.dto;

import com.stackflow.inventory.order.domain.Order;
import com.stackflow.inventory.order.domain.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * @param allowedTransitions what this order may become next — the UI renders its action buttons
 *     from the server's state machine instead of duplicating the rules
 */
public record OrderResponse(
        Long id,
        String orderNumber,
        String customerName,
        String customerEmail,
        OrderStatus status,
        Set<OrderStatus> allowedTransitions,
        BigDecimal totalAmount,
        String notes,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt,
        List<OrderItemResponse> items,
        List<OrderStatusHistoryResponse> statusHistory) {

    public static OrderResponse from(Order order) {
        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomerName(),
                order.getCustomerEmail(),
                order.getStatus(),
                order.getStatus().allowedTransitions(),
                order.getTotalAmount(),
                order.getNotes(),
                order.getCreatedBy(),
                order.getCreatedAt(),
                order.getUpdatedAt(),
                order.getItems().stream().map(OrderItemResponse::from).toList(),
                order.getStatusHistory().stream()
                        .map(OrderStatusHistoryResponse::from)
                        .toList());
    }
}
