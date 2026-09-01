package com.stackflow.inventory.stock.service;

/**
 * One line of a stock operation. This is the contract other features (orders) speak — they never
 * touch {@code StockItem} directly.
 */
public record StockLine(Long productId, int quantity) {

    public StockLine {
        if (quantity <= 0) {
            throw new IllegalArgumentException("Stock line quantity must be positive");
        }
    }
}
