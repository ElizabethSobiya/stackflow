package com.stackflow.inventory.catalog.dto;

import com.stackflow.inventory.catalog.domain.Product;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * @param quantity current stock level, or {@code null} when the caller did not ask for stock to be
 *     resolved
 */
public record ProductResponse(
        Long id,
        String name,
        String description,
        String category,
        String sku,
        BigDecimal price,
        boolean active,
        Integer quantity,
        Integer lowStockThreshold,
        Boolean lowStock,
        Instant createdAt,
        Instant updatedAt) {

    public static ProductResponse from(Product product) {
        return from(product, null, null, null);
    }

    public static ProductResponse from(Product product, Integer quantity, Integer threshold, Boolean lowStock) {
        return new ProductResponse(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getCategory(),
                product.getSku(),
                product.getPrice(),
                product.isActive(),
                quantity,
                threshold,
                lowStock,
                product.getCreatedAt(),
                product.getUpdatedAt());
    }
}
