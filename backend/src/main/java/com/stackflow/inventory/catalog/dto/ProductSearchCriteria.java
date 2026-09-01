package com.stackflow.inventory.catalog.dto;

import java.math.BigDecimal;

/**
 * Search filters for the product list. Every field is optional; {@code null} means "no filter".
 */
public record ProductSearchCriteria(
        String search, String category, Boolean active, BigDecimal minPrice, BigDecimal maxPrice) {

    public static ProductSearchCriteria empty() {
        return new ProductSearchCriteria(null, null, null, null, null);
    }
}
