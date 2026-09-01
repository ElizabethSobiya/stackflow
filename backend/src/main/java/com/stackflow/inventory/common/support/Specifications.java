package com.stackflow.inventory.common.support;

import java.util.Arrays;
import java.util.Objects;
import org.springframework.data.jpa.domain.Specification;

/**
 * Combines optional specifications.
 *
 * <p>Filter factories return {@code null} when the caller supplied no value, so the service can
 * hand every possible filter to {@link #allOf} and let the unused ones drop out. That keeps search
 * methods free of {@code if (x != null)} chains as filters are added.
 */
public final class Specifications {

    private Specifications() {}

    @SafeVarargs
    public static <T> Specification<T> allOf(Specification<T>... specifications) {
        return Arrays.stream(specifications)
                .filter(Objects::nonNull)
                .reduce(Specification::and)
                .orElse(null);
    }
}
