package com.stackflow.inventory.stock.dto;

import com.stackflow.inventory.stock.domain.StockItem;
import java.math.BigDecimal;
import java.time.Instant;

/** Stock level enriched with the product identity a stock screen needs. */
public record StockItemResponse(
        Long productId,
        String productName,
        String sku,
        String category,
        BigDecimal price,
        int quantity,
        int lowStockThreshold,
        boolean lowStock,
        Instant updatedAt) {

    public static StockItemResponse from(StockItem item) {
        return new StockItemResponse(
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getProduct().getSku(),
                item.getProduct().getCategory(),
                item.getProduct().getPrice(),
                item.getQuantity(),
                item.getLowStockThreshold(),
                item.isLowStock(),
                item.getUpdatedAt());
    }
}
