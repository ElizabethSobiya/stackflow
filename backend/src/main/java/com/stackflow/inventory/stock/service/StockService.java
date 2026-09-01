package com.stackflow.inventory.stock.service;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.stock.domain.StockItem;
import com.stackflow.inventory.stock.domain.StockMovement;
import com.stackflow.inventory.stock.domain.StockMovementReason;
import java.util.Collection;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * The stock feature's public surface.
 *
 * <p>Other features depend on this interface only. If stock ever moves behind a network boundary,
 * this is the seam: swap the implementation for a client and nothing else changes.
 */
public interface StockService {

    StockItem initialiseFor(Product product, int initialQuantity, Integer lowStockThreshold);

    StockView getByProductId(Long productId);

    /** Bulk read used by list endpoints to avoid an N+1 query per row. */
    Map<Long, StockView> getByProductIds(Collection<Long> productIds);

    /**
     * Applies a signed adjustment and records the movement.
     *
     * <p>Retries internally on optimistic-lock conflicts.
     */
    StockView adjust(Long productId, int delta, StockMovementReason reason, String note, Long referenceId);

    /**
     * Deducts every line atomically for a confirmed order.
     *
     * @throws com.stackflow.inventory.stock.domain.InsufficientStockException if any line cannot be
     *     satisfied — no line is deducted in that case
     */
    void deductForOrder(Long orderId, Collection<StockLine> lines);

    /** Puts stock back when a confirmed order is cancelled. */
    void restoreForOrder(Long orderId, Collection<StockLine> lines);

    void changeThreshold(Long productId, int threshold);

    Page<StockItem> findLowStock(Pageable pageable);

    Page<StockMovement> findMovements(Long productId, Pageable pageable);

    long countLowStock();

    long totalUnitsOnHand();
}
