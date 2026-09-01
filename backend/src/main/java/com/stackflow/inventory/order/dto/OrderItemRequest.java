package com.stackflow.inventory.order.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record OrderItemRequest(@NotNull Long productId, @NotNull @Positive Integer quantity) {}
