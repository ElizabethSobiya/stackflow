package com.stackflow.inventory.common.exception;

import com.stackflow.inventory.common.api.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Translates exceptions into the single {@link ApiError} contract.
 *
 * <p>Controllers and services never build error responses themselves; they throw, and this is the
 * only place that decides status codes. Internal failures are logged with a stack trace but never
 * leak their message to the client.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<ApiError> handleApplication(ApplicationException ex, HttpServletRequest request) {
        log.debug("Handled application exception [{}]: {}", ex.getCode(), ex.getMessage());
        return ResponseEntity.status(ex.getStatus())
                .body(ApiError.of(ex.getStatus().value(), ex.getCode(), ex.getMessage(), request.getRequestURI()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .map(error -> new ApiError.FieldError(error.getField(), error.getDefaultMessage()))
                .toList();
        return ResponseEntity.badRequest()
                .body(ApiError.of(
                        HttpStatus.BAD_REQUEST.value(),
                        ErrorCode.VALIDATION_FAILED,
                        "Request validation failed",
                        request.getRequestURI(),
                        fieldErrors));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(
            ConstraintViolationException ex, HttpServletRequest request) {
        List<ApiError.FieldError> fieldErrors = ex.getConstraintViolations().stream()
                .map(violation ->
                        new ApiError.FieldError(String.valueOf(violation.getPropertyPath()), violation.getMessage()))
                .toList();
        return ResponseEntity.badRequest()
                .body(ApiError.of(
                        HttpStatus.BAD_REQUEST.value(),
                        ErrorCode.VALIDATION_FAILED,
                        "Request validation failed",
                        request.getRequestURI(),
                        fieldErrors));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest()
                .body(ApiError.of(
                        HttpStatus.BAD_REQUEST.value(),
                        ErrorCode.VALIDATION_FAILED,
                        "Invalid value for parameter '%s'".formatted(ex.getName()),
                        request.getRequestURI()));
    }

    /**
     * Raised when two transactions touch the same {@code @Version}-guarded row. The write is
     * rejected rather than silently overwriting — the client is expected to retry.
     */
    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiError> handleOptimisticLock(
            OptimisticLockingFailureException ex, HttpServletRequest request) {
        log.warn("Optimistic lock conflict on {}: {}", request.getRequestURI(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(
                        HttpStatus.CONFLICT.value(),
                        ErrorCode.CONCURRENT_MODIFICATION,
                        "The record was modified by another request. Please retry.",
                        request.getRequestURI()));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleDataIntegrity(
            DataIntegrityViolationException ex, HttpServletRequest request) {
        log.warn("Data integrity violation on {}", request.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiError.of(
                        HttpStatus.CONFLICT.value(),
                        ErrorCode.RESOURCE_CONFLICT,
                        "The request conflicts with existing data.",
                        request.getRequestURI()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(AuthenticationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiError.of(
                        HttpStatus.UNAUTHORIZED.value(),
                        ErrorCode.AUTHENTICATION_FAILED,
                        "Invalid credentials",
                        request.getRequestURI()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiError.of(
                        HttpStatus.FORBIDDEN.value(),
                        ErrorCode.ACCESS_DENIED,
                        "You do not have permission to perform this action.",
                        request.getRequestURI()));
    }

    /**
     * A body Spring could not parse — malformed JSON, a value of the wrong type, or a string that
     * is not one of an enum's constants. The request never reaches a controller, so without this it
     * would fall to the catch-all below and be reported as a server fault.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleUnreadableBody(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        log.warn("Unreadable request body on {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiError.of(
                        HttpStatus.BAD_REQUEST.value(),
                        ErrorCode.MALFORMED_REQUEST,
                        "The request body is malformed or contains a value this endpoint does not accept.",
                        request.getRequestURI()));
    }

    /** An unmapped path. A typo in a URL is the client's mistake, not a server fault. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNoResource(NoResourceFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of(
                        HttpStatus.NOT_FOUND.value(),
                        ErrorCode.RESOURCE_NOT_FOUND,
                        "No endpoint matches this request.",
                        request.getRequestURI()));
    }

    /** A known path addressed with the wrong verb. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiError.of(
                        HttpStatus.METHOD_NOT_ALLOWED.value(),
                        ErrorCode.METHOD_NOT_ALLOWED,
                        "%s is not supported by this endpoint.".formatted(ex.getMethod()),
                        request.getRequestURI()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {} {}", request.getMethod(), request.getRequestURI(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of(
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        ErrorCode.INTERNAL_ERROR,
                        "Something went wrong. Please try again.",
                        request.getRequestURI()));
    }
}
