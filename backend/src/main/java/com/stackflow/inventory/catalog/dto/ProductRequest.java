package com.stackflow.inventory.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * @param initialQuantity only honoured on create; stock changes afterwards go through the stock API
 *     so that every movement is recorded with a reason
 */
public record ProductRequest(
        @NotBlank @Size(max = 160) String name,
        @Size(max = 1000) String description,
        @NotBlank @Size(max = 80) String category,
        @NotBlank
                @Size(max = 64)
                @Pattern(
                        regexp = "^[A-Za-z0-9._-]+$",
                        message = "SKU may contain letters, digits, dot, dash and underscore only")
                String sku,
        @NotNull @DecimalMin(value = "0.0", inclusive = false) @Digits(integer = 10, fraction = 2) BigDecimal price,
        @PositiveOrZero Integer initialQuantity,
        @PositiveOrZero Integer lowStockThreshold) {}
