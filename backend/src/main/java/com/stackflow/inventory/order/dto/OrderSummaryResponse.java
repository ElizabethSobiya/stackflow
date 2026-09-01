package com.stackflow.inventory.order.dto;

import com.stackflow.inventory.order.domain.Order;
import com.stackflow.inventory.order.domain.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

/** List-view shape: no line items, so a page of orders costs a bounded number of queries. */
public record OrderSummaryResponse(
        Long id,
        String orderNumber,
        String customerName,
        OrderStatus status,
        Set<OrderStatus> allowedTransitions,
        BigDecimal totalAmount,
        long totalUnits,
        Instant createdAt) {

    public static OrderSummaryResponse from(Order order, long totalUnits) {
        return new OrderSummaryResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomerName(),
                order.getStatus(),
                order.getStatus().allowedTransitions(),
                order.getTotalAmount(),
                totalUnits,
                order.getCreatedAt());
    }
}
