package com.stackflow.inventory.stock.domain;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * The stock level of one product.
 *
 * <p>{@link Version} is the reason this class exists as its own aggregate root: two orders
 * confirming the same product at the same moment both read {@code quantity = 5} and both write
 * {@code 3}, losing one deduction. With the version column the second write fails loudly
 * ({@code OptimisticLockingFailureException}) instead of silently corrupting the count, and the
 * caller retries against fresh state.
 */
@Entity
@Getter
@Table(name = "stock_items")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockItem extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false, unique = true)
    private Product product;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "low_stock_threshold", nullable = false)
    private int lowStockThreshold;

    @Version
    @Column(nullable = false)
    private long version;

    @Builder
    private StockItem(Product product, int quantity, int lowStockThreshold) {
        this.product = product;
        this.quantity = quantity;
        this.lowStockThreshold = lowStockThreshold;
    }

    /**
     * @return the resulting quantity
     * @throws IllegalArgumentException if {@code amount} is not positive
     */
    public int increase(int amount) {
        requirePositive(amount);
        this.quantity += amount;
        return this.quantity;
    }

    /**
     * @throws InsufficientStockException if the stock would go negative — the invariant that makes
     *     this an aggregate root rather than a plain column on {@code products}
     */
    public int decrease(int amount) {
        requirePositive(amount);
        if (amount > quantity) {
            throw new InsufficientStockException(product.getSku(), amount, quantity);
        }
        this.quantity -= amount;
        return this.quantity;
    }

    /** Applies a signed delta; used by manual adjustments where the sign is caller-supplied. */
    public int applyDelta(int delta) {
        if (delta == 0) {
            throw new IllegalArgumentException("Stock delta must not be zero");
        }
        return delta > 0 ? increase(delta) : decrease(-delta);
    }

    public void changeThreshold(int newThreshold) {
        if (newThreshold < 0) {
            throw new IllegalArgumentException("Low stock threshold must not be negative");
        }
        this.lowStockThreshold = newThreshold;
    }

    public boolean isLowStock() {
        return quantity <= lowStockThreshold;
    }

    private static void requirePositive(int amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Stock amount must be positive");
        }
    }
}
