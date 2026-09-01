package com.stackflow.inventory.order.service;

import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.dto.CreateOrderRequest;
import com.stackflow.inventory.order.dto.OrderResponse;
import com.stackflow.inventory.order.dto.OrderSearchCriteria;
import com.stackflow.inventory.order.dto.OrderSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface OrderService {

    OrderResponse create(CreateOrderRequest request);

    OrderResponse getById(Long id);

    Page<OrderSummaryResponse> search(OrderSearchCriteria criteria, Pageable pageable);

    /**
     * Applies a status transition, together with its stock side effects.
     *
     * @throws com.stackflow.inventory.order.domain.InvalidStatusTransitionException if the move is
     *     not permitted from the order's current status
     * @throws com.stackflow.inventory.stock.domain.InsufficientStockException when confirming an
     *     order the stock cannot cover
     */
    OrderResponse changeStatus(Long orderId, OrderStatus target, String note, Long actorId);
}
