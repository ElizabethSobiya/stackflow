package com.stackflow.inventory.stock.repository;

import com.stackflow.inventory.stock.domain.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    Page<StockMovement> findByStockItemProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);
}
