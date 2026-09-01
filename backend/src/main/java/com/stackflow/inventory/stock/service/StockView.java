package com.stackflow.inventory.stock.service;

import com.stackflow.inventory.stock.domain.StockItem;

/** Read model of a stock level, safe to hand across feature boundaries. */
public record StockView(Long productId, int quantity, int lowStockThreshold, boolean lowStock) {

    public static StockView from(StockItem item) {
        return new StockView(
                item.getProduct().getId(), item.getQuantity(), item.getLowStockThreshold(), item.isLowStock());
    }
}
