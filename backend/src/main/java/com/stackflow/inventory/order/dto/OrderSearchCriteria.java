package com.stackflow.inventory.order.dto;

import com.stackflow.inventory.order.domain.OrderStatus;
import java.time.Instant;

public record OrderSearchCriteria(String search, OrderStatus status, Instant from, Instant to, Long createdBy) {

    public static OrderSearchCriteria empty() {
        return new OrderSearchCriteria(null, null, null, null, null);
    }
}
