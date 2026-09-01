package com.stackflow.inventory.stock.repository;

import com.stackflow.inventory.stock.domain.StockItem;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StockItemRepository extends JpaRepository<StockItem, Long> {

    Optional<StockItem> findByProductId(Long productId);

    /** Bulk lookup: the product list resolves every stock level in one query, not one per row. */
    @Query("select s from StockItem s join fetch s.product p where p.id in :productIds")
    List<StockItem> findAllByProductIdIn(Collection<Long> productIds);

    @Query("select s from StockItem s join fetch s.product p where s.quantity <= s.lowStockThreshold")
    Page<StockItem> findLowStock(Pageable pageable);

    @Query("select count(s) from StockItem s where s.quantity <= s.lowStockThreshold")
    long countLowStock();

    @Query("select coalesce(sum(s.quantity), 0) from StockItem s")
    long totalUnitsOnHand();
}
