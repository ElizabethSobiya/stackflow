package com.stackflow.inventory.order.dto;

import com.stackflow.inventory.order.domain.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record OrderStatusChangeRequest(@NotNull OrderStatus status, @Size(max = 255) String note) {}
