package com.stackflow.inventory.order.domain;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

/**
 * Order lifecycle, and the only definition of which moves are legal.
 *
 * <p>The rules live on the server, in the domain, next to the states themselves — not in the UI and
 * not scattered across service methods. A client that asks for {@code DELIVERED -> PENDING} is
 * rejected regardless of which screen or script sent the request.
 *
 * <pre>
 *   PENDING ──▶ CONFIRMED ──▶ SHIPPED ──▶ DELIVERED
 *      │            │
 *      └────────────┴──────▶ CANCELLED
 * </pre>
 */
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED;

    /** Statuses reachable from this one in a single step. */
    public Set<OrderStatus> allowedTransitions() {
        return switch (this) {
            case PENDING -> EnumSet.of(CONFIRMED, CANCELLED);
            case CONFIRMED -> EnumSet.of(SHIPPED, CANCELLED);
            case SHIPPED -> EnumSet.of(DELIVERED);
            case DELIVERED, CANCELLED -> Collections.emptySet();
        };
    }

    public boolean canTransitionTo(OrderStatus target) {
        return allowedTransitions().contains(target);
    }

    public boolean isTerminal() {
        return allowedTransitions().isEmpty();
    }

    /**
     * @return true when reaching this status has already taken units out of stock — cancelling from
     *     here must put them back
     */
    public boolean holdsStock() {
        return this == CONFIRMED || this == SHIPPED;
    }

    /** Revenue is recognised once an order is confirmed and not later cancelled. */
    public boolean countsAsRevenue() {
        return this == CONFIRMED || this == SHIPPED || this == DELIVERED;
    }
}
