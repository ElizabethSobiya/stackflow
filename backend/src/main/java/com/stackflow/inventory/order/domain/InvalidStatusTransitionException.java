package com.stackflow.inventory.order.domain;

import com.stackflow.inventory.common.exception.BusinessRuleException;
import com.stackflow.inventory.common.exception.ErrorCode;

public class InvalidStatusTransitionException extends BusinessRuleException {

    public InvalidStatusTransitionException(OrderStatus from, OrderStatus to) {
        super(
                ErrorCode.INVALID_STATUS_TRANSITION,
                "Cannot move an order from %s to %s. Allowed: %s".formatted(from, to, from.allowedTransitions()));
    }
}
