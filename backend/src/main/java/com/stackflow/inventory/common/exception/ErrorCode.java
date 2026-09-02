package com.stackflow.inventory.common.exception;

/** Stable, machine-readable error codes shared with the frontend. */
public final class ErrorCode {

    public static final String VALIDATION_FAILED = "VALIDATION_FAILED";
    public static final String RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND";
    public static final String BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION";
    public static final String RESOURCE_CONFLICT = "RESOURCE_CONFLICT";
    public static final String CONCURRENT_MODIFICATION = "CONCURRENT_MODIFICATION";
    public static final String INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK";
    public static final String INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION";
    public static final String AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED";
    public static final String ACCESS_DENIED = "ACCESS_DENIED";
    public static final String MALFORMED_REQUEST = "MALFORMED_REQUEST";
    public static final String METHOD_NOT_ALLOWED = "METHOD_NOT_ALLOWED";
    public static final String INTERNAL_ERROR = "INTERNAL_ERROR";

    private ErrorCode() {}
}
