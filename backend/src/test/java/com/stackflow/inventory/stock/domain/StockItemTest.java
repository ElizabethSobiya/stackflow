package com.stackflow.inventory.stock.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.stackflow.inventory.catalog.domain.Product;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class StockItemTest {

    @Test
    void decreaseReducesQuantity() {
        StockItem item = stockItem(10, 3);
        assertThat(item.decrease(4)).isEqualTo(6);
        assertThat(item.getQuantity()).isEqualTo(6);
    }

    @Test
    void decreaseBelowZeroIsRefused() {
        StockItem item = stockItem(2, 1);

        assertThatThrownBy(() -> item.decrease(3))
                .isInstanceOf(InsufficientStockException.class)
                .hasMessageContaining("requested 3")
                .hasMessageContaining("available 2");

        assertThat(item.getQuantity()).isEqualTo(2);
    }

    @Test
    void applyDeltaHandlesBothDirections() {
        StockItem item = stockItem(5, 2);
        assertThat(item.applyDelta(3)).isEqualTo(8);
        assertThat(item.applyDelta(-6)).isEqualTo(2);
    }

    @Test
    void zeroDeltaIsMeaningless() {
        assertThatThrownBy(() -> stockItem(5, 2).applyDelta(0))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void lowStockIsInclusiveOfTheThreshold() {
        assertThat(stockItem(3, 3).isLowStock()).isTrue();
        assertThat(stockItem(4, 3).isLowStock()).isFalse();
        assertThat(stockItem(0, 0).isLowStock()).isTrue();
    }

    private static StockItem stockItem(int quantity, int threshold) {
        Product product = Product.builder()
                .name("Widget")
                .category("Test")
                .sku("SKU-1")
                .price(new BigDecimal("9.99"))
                .build();
        return StockItem.builder()
                .product(product)
                .quantity(quantity)
                .lowStockThreshold(threshold)
                .build();
    }
}
