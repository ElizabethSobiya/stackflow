package com.stackflow.inventory.stock.service;

import com.stackflow.inventory.catalog.domain.Product;
import com.stackflow.inventory.common.exception.ResourceNotFoundException;
import com.stackflow.inventory.common.support.OptimisticRetry;
import com.stackflow.inventory.stock.config.StockProperties;
import com.stackflow.inventory.stock.domain.StockItem;
import com.stackflow.inventory.stock.domain.StockMovement;
import com.stackflow.inventory.stock.domain.StockMovementReason;
import com.stackflow.inventory.stock.repository.StockItemRepository;
import com.stackflow.inventory.stock.repository.StockMovementRepository;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Stock levels and their audit trail.
 *
 * <p>Write paths that can lose an optimistic-locking race are wrapped in
 * {@link OptimisticRetry}. The retry has to start a <em>new</em> transaction each attempt, which is
 * why {@link TransactionTemplate} is used explicitly instead of {@code @Transactional} on the
 * public method: a rolled-back transaction cannot be reused, and self-invocation would bypass the
 * proxy anyway.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StockServiceImpl implements StockService {

    private final StockItemRepository stockItemRepository;
    private final StockMovementRepository stockMovementRepository;
    private final StockProperties stockProperties;
    private final TransactionTemplate transactionTemplate;

    @Override
    @Transactional
    public StockItem initialiseFor(Product product, int initialQuantity, Integer lowStockThreshold) {
        int threshold = lowStockThreshold != null ? lowStockThreshold : stockProperties.defaultLowStockThreshold();
        StockItem item = stockItemRepository.save(StockItem.builder()
                .product(product)
                .quantity(Math.max(initialQuantity, 0))
                .lowStockThreshold(threshold)
                .build());
        if (item.getQuantity() > 0) {
            recordMovement(item, item.getQuantity(), StockMovementReason.INITIAL_STOCK, null, "Initial stock");
        }
        return item;
    }

    @Override
    public StockView getByProductId(Long productId) {
        return StockView.from(requireStockItem(productId));
    }

    @Override
    public Map<Long, StockView> getByProductIds(Collection<Long> productIds) {
        if (productIds.isEmpty()) {
            return Map.of();
        }
        return stockItemRepository.findAllByProductIdIn(productIds).stream()
                .map(StockView::from)
                .collect(Collectors.toMap(StockView::productId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
    }

    /**
     * {@code NOT_SUPPORTED} because this method owns its transactions: the class-level read-only
     * transaction would otherwise wrap it, the {@link TransactionTemplate} would merely join that
     * read-only transaction, and Hibernate would never flush the change.
     */
    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public StockView adjust(
            Long productId, int delta, StockMovementReason reason, String note, Long referenceId) {
        return OptimisticRetry.execute(
                "stock-adjust",
                stockProperties.optimisticLockRetries(),
                () -> transactionTemplate.execute(status -> {
                    StockItem item = requireStockItem(productId);
                    int resulting = item.applyDelta(delta);
                    recordMovement(item, delta, reason, referenceId, note);
                    log.debug("Adjusted stock for product {} by {} -> {}", productId, delta, resulting);
                    return StockView.from(item);
                }));
    }

    @Override
    @Transactional
    public void deductForOrder(Long orderId, Collection<StockLine> lines) {
        applyOrderLines(orderId, lines, -1, StockMovementReason.ORDER_CONFIRMED);
    }

    @Override
    @Transactional
    public void restoreForOrder(Long orderId, Collection<StockLine> lines) {
        applyOrderLines(orderId, lines, 1, StockMovementReason.ORDER_CANCELLED);
    }

    @Override
    @Transactional
    public void changeThreshold(Long productId, int threshold) {
        requireStockItem(productId).changeThreshold(threshold);
    }

    @Override
    public Page<StockItem> findLowStock(Pageable pageable) {
        return stockItemRepository.findLowStock(pageable);
    }

    @Override
    public Page<StockMovement> findMovements(Long productId, Pageable pageable) {
        return stockMovementRepository.findByStockItemProductIdOrderByCreatedAtDesc(productId, pageable);
    }

    @Override
    public long countLowStock() {
        return stockItemRepository.countLowStock();
    }

    @Override
    public long totalUnitsOnHand() {
        return stockItemRepository.totalUnitsOnHand();
    }

    /**
     * All lines succeed or none do, and the batch joins the caller's transaction so the stock move
     * commits together with whatever prompted it — an order can never be CONFIRMED with its units
     * still on the shelf.
     *
     * <p>No retry here on purpose: a lock conflict has already doomed the caller's transaction, so
     * the caller re-runs the whole unit of work instead.
     */
    private void applyOrderLines(
            Long orderId, Collection<StockLine> lines, int sign, StockMovementReason reason) {
        for (StockLine line : lines) {
            StockItem item = requireStockItem(line.productId());
            int delta = sign * line.quantity();
            item.applyDelta(delta);
            recordMovement(item, delta, reason, orderId, null);
        }
    }

    private void recordMovement(
            StockItem item, int delta, StockMovementReason reason, Long referenceId, String note) {
        stockMovementRepository.save(StockMovement.builder()
                .stockItem(item)
                .delta(delta)
                .resultingQuantity(item.getQuantity())
                .reason(reason)
                .referenceId(referenceId)
                .note(note)
                .build());
    }

    private StockItem requireStockItem(Long productId) {
        return stockItemRepository
                .findByProductId(productId)
                .orElseThrow(() -> ResourceNotFoundException.of("Stock for product", productId));
    }
}
