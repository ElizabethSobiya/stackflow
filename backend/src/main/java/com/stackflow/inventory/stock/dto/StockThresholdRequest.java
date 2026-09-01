package com.stackflow.inventory.stock.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record StockThresholdRequest(@NotNull @PositiveOrZero Integer lowStockThreshold) {}
