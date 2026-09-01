package com.stackflow.inventory.user.domain;

/**
 * Coarse-grained role. Fine-grained rules live in {@code @PreAuthorize} expressions so a new
 * permission does not require a new role.
 */
public enum Role {
    /** Full access: catalog writes, stock adjustments, order status transitions, user management. */
    ADMIN,
    /** Day-to-day operations: reads everything, creates orders, adjusts stock. No user management. */
    STAFF
}
