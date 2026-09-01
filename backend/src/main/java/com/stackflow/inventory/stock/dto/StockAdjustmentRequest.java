package com.stackflow.inventory.stock.dto;

import com.stackflow.inventory.stock.domain.StockMovementReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * @param delta signed change; negative writes stock off, positive receives it
 */
public record StockAdjustmentRequest(
        @NotNull Integer delta, @NotNull StockMovementReason reason, @Size(max = 255) String note) {}
