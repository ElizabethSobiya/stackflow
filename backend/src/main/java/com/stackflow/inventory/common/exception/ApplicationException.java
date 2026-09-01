package com.stackflow.inventory.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base class for every exception the application raises deliberately.
 *
 * <p>Carrying the status and error code on the exception keeps {@link GlobalExceptionHandler} free
 * of a growing {@code instanceof} ladder: new failure modes subclass this and are handled already.
 */
@Getter
public abstract class ApplicationException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected ApplicationException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
