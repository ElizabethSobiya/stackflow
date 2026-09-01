package com.stackflow.inventory.stock.domain;

/** Why a stock level changed — every movement is attributable. */
public enum StockMovementReason {
    INITIAL_STOCK,
    PURCHASE_RECEIVED,
    MANUAL_ADJUSTMENT,
    ORDER_CONFIRMED,
    ORDER_CANCELLED,
    DAMAGE_WRITE_OFF,
    STOCK_COUNT_CORRECTION
}
