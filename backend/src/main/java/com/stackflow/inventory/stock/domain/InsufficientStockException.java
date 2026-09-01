package com.stackflow.inventory.stock.domain;

import com.stackflow.inventory.common.exception.BusinessRuleException;
import com.stackflow.inventory.common.exception.ErrorCode;

public class InsufficientStockException extends BusinessRuleException {

    public InsufficientStockException(String sku, int requested, int available) {
        super(
                ErrorCode.INSUFFICIENT_STOCK,
                "Insufficient stock for %s: requested %d, available %d".formatted(sku, requested, available));
    }
}
