package com.stackflow.inventory.order.dto;

import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.domain.OrderStatusHistory;
import java.time.Instant;

public record OrderStatusHistoryResponse(
        Long id, OrderStatus fromStatus, OrderStatus toStatus, Long changedBy, String note, Instant changedAt) {

    public static OrderStatusHistoryResponse from(OrderStatusHistory history) {
        return new OrderStatusHistoryResponse(
                history.getId(),
                history.getFromStatus(),
                history.getToStatus(),
                history.getChangedBy(),
                history.getNote(),
                history.getCreatedAt());
    }
}
