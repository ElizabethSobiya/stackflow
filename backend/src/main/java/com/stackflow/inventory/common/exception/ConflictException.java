package com.stackflow.inventory.common.exception;

import org.springframework.http.HttpStatus;

/** The request collides with existing state — duplicate SKU, duplicate email (409). */
public class ConflictException extends ApplicationException {

    public ConflictException(String message) {
        this(ErrorCode.RESOURCE_CONFLICT, message);
    }

    public ConflictException(String code, String message) {
        super(HttpStatus.CONFLICT, code, message);
    }
}
