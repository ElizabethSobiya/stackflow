package com.stackflow.inventory.order.repository;

import com.stackflow.inventory.order.domain.Order;
import com.stackflow.inventory.order.domain.OrderStatus;
import java.time.Instant;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

public final class OrderSpecifications {

    private OrderSpecifications() {}

    public static Specification<Order> hasStatus(OrderStatus status) {
        return status == null ? null : (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    /** Matches order number, customer name or customer email. */
    public static Specification<Order> matchesText(String term) {
        if (!StringUtils.hasText(term)) {
            return null;
        }
        String pattern = "%" + term.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("orderNumber")), pattern),
                cb.like(cb.lower(root.get("customerName")), pattern),
                cb.like(cb.lower(cb.coalesce(root.get("customerEmail"), "")), pattern));
    }

    public static Specification<Order> createdAfter(Instant from) {
        return from == null ? null : (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<Order> createdBefore(Instant to) {
        return to == null ? null : (root, query, cb) -> cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }

    public static Specification<Order> createdBy(Long userId) {
        return userId == null ? null : (root, query, cb) -> cb.equal(root.get("createdBy"), userId);
    }
}
