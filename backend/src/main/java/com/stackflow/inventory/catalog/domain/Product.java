package com.stackflow.inventory.catalog.domain;

import com.stackflow.inventory.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * A sellable item in the catalog.
 *
 * <p>Deleting a product would orphan historical order lines, so removal is a soft
 * {@link #deactivate()} — the row stays, it just stops appearing in the sellable catalog.
 */
@Entity
@Getter
@Table(name = "products")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Product extends BaseEntity {

    @Column(nullable = false, length = 160)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, unique = true, length = 64)
    private String sku;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private boolean active = true;

    @Builder
    private Product(String name, String description, String category, String sku, BigDecimal price) {
        this.name = name;
        this.description = description;
        this.category = category;
        this.sku = sku;
        this.price = price;
        this.active = true;
    }

    public void update(String name, String description, String category, BigDecimal price) {
        this.name = name;
        this.description = description;
        this.category = category;
        this.price = price;
    }

    public void changeSku(String sku) {
        this.sku = sku;
    }

    public void deactivate() {
        this.active = false;
    }

    public void activate() {
        this.active = true;
    }
}
