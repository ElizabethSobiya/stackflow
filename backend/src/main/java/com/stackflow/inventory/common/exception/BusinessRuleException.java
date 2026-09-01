package com.stackflow.inventory.common.exception;

import org.springframework.http.HttpStatus;

/** A syntactically valid request that the domain refuses (422). */
public class BusinessRuleException extends ApplicationException {

    public BusinessRuleException(String message) {
        this(ErrorCode.BUSINESS_RULE_VIOLATION, message);
    }

    public BusinessRuleException(String code, String message) {
        super(HttpStatus.UNPROCESSABLE_ENTITY, code, message);
    }
}
