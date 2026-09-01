package com.stackflow.inventory.order.dto;

import com.stackflow.inventory.order.domain.OrderItem;
import java.math.BigDecimal;

public record OrderItemResponse(
        Long id, Long productId, String productName, String sku, int quantity, BigDecimal unitPrice,
        BigDecimal lineTotal) {

    public static OrderItemResponse from(OrderItem item) {
        return new OrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProductName(),
                item.getSku(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.lineTotal());
    }
}
