package com.stackflow.inventory.common.api;

import java.time.Instant;
import java.util.List;

/**
 * The single error shape every failing endpoint returns.
 *
 * @param code machine-readable, stable across releases — clients branch on this, never on {@code message}
 * @param message human-readable, safe to show to an end user
 * @param fieldErrors populated for validation failures only
 */
public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        List<FieldError> fieldErrors) {

    public record FieldError(String field, String message) {}

    public static ApiError of(int status, String code, String message, String path) {
        return new ApiError(Instant.now(), status, code, message, path, null);
    }

    public static ApiError of(int status, String code, String message, String path, List<FieldError> fieldErrors) {
        return new ApiError(Instant.now(), status, code, message, path, fieldErrors);
    }
}
