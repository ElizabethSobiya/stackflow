package com.stackflow.inventory.catalog.repository;

import com.stackflow.inventory.catalog.domain.Product;
import java.math.BigDecimal;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.util.StringUtils;

/**
 * Composable predicates for product search.
 *
 * <p>Each filter is one small, independently testable {@code Specification}; the service combines
 * only the ones the caller actually supplied. Adding a filter means adding a method here — no
 * branching query strings and no repository method explosion.
 */
public final class ProductSpecifications {

    private ProductSpecifications() {}

    /** Case-insensitive match across name, SKU and description. */
    public static Specification<Product> matchesText(String term) {
        if (!StringUtils.hasText(term)) {
            return null;
        }
        String pattern = "%" + term.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), pattern),
                cb.like(cb.lower(root.get("sku")), pattern),
                cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern));
    }

    public static Specification<Product> hasCategory(String category) {
        if (!StringUtils.hasText(category)) {
            return null;
        }
        return (root, query, cb) -> cb.equal(cb.lower(root.get("category")), category.trim().toLowerCase());
    }

    public static Specification<Product> isActive(Boolean active) {
        if (active == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("active"), active);
    }

    public static Specification<Product> priceAtLeast(BigDecimal minPrice) {
        if (minPrice == null) {
            return null;
        }
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice);
    }

    public static Specification<Product> priceAtMost(BigDecimal maxPrice) {
        if (maxPrice == null) {
            return null;
        }
        return (root, query, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice);
    }
}
