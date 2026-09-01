package com.stackflow.inventory.stock.domain;

import com.stackflow.inventory.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedBy;

/**
 * Append-only audit of every stock change.
 *
 * <p>Without it, "why is this count wrong?" is unanswerable. With it, the current quantity is
 * reconstructable from history, which is what makes stock discrepancies debuggable in production.
 */
@Entity
@Getter
@Table(name = "stock_movements")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class StockMovement extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_item_id", nullable = false)
    private StockItem stockItem;

    /** Signed change: positive for inbound, negative for outbound. */
    @Column(nullable = false)
    private int delta;

    @Column(name = "resulting_quantity", nullable = false)
    private int resultingQuantity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private StockMovementReason reason;

    /** Order id for order-driven movements, null otherwise. */
    @Column(name = "reference_id")
    private Long referenceId;

    @Column(length = 255)
    private String note;

    @CreatedBy
    @Column(name = "created_by")
    private Long createdBy;

    @Builder
    private StockMovement(
            StockItem stockItem,
            int delta,
            int resultingQuantity,
            StockMovementReason reason,
            Long referenceId,
            String note) {
        this.stockItem = stockItem;
        this.delta = delta;
        this.resultingQuantity = resultingQuantity;
        this.reason = reason;
        this.referenceId = referenceId;
        this.note = note;
    }
}
