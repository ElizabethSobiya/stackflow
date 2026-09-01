package com.stackflow.inventory.common.exception;

import org.springframework.http.HttpStatus;

public class AuthenticationFailedException extends ApplicationException {

    public AuthenticationFailedException(String message) {
        super(HttpStatus.UNAUTHORIZED, ErrorCode.AUTHENTICATION_FAILED, message);
    }
}
