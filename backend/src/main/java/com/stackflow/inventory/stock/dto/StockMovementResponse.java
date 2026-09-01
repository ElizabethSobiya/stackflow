package com.stackflow.inventory.stock.dto;

import com.stackflow.inventory.stock.domain.StockMovement;
import com.stackflow.inventory.stock.domain.StockMovementReason;
import java.time.Instant;

public record StockMovementResponse(
        Long id,
        int delta,
        int resultingQuantity,
        StockMovementReason reason,
        Long referenceId,
        String note,
        Long createdBy,
        Instant createdAt) {

    public static StockMovementResponse from(StockMovement movement) {
        return new StockMovementResponse(
                movement.getId(),
                movement.getDelta(),
                movement.getResultingQuantity(),
                movement.getReason(),
                movement.getReferenceId(),
                movement.getNote(),
                movement.getCreatedBy(),
                movement.getCreatedAt());
    }
}
