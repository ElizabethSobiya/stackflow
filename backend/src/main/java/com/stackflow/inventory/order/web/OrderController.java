package com.stackflow.inventory.order.web;

import com.stackflow.inventory.common.api.PageResponse;
import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.dto.CreateOrderRequest;
import com.stackflow.inventory.order.dto.OrderResponse;
import com.stackflow.inventory.order.dto.OrderSearchCriteria;
import com.stackflow.inventory.order.dto.OrderStatusChangeRequest;
import com.stackflow.inventory.order.dto.OrderSummaryResponse;
import com.stackflow.inventory.order.service.OrderService;
import com.stackflow.inventory.security.Roles;
import com.stackflow.inventory.security.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Orders", description = "Order creation and status workflow")
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Search orders with server-side pagination and filtering")
    public PageResponse<OrderSummaryResponse> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(required = false) Long createdBy,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        var criteria = new OrderSearchCriteria(search, status, from, to, createdBy);
        return PageResponse.of(orderService.search(criteria, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Full order with items and status history")
    public OrderResponse get(@PathVariable Long id) {
        return orderService.getById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(Roles.HAS_ANY_ROLE)
    @Operation(summary = "Create a PENDING order; stock is committed only on confirmation")
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize(Roles.HAS_ADMIN)
    @Operation(
            summary = "Move an order to the next status",
            description = "Transitions are validated server-side; confirming deducts stock and "
                    + "cancelling a confirmed order restores it.")
    public OrderResponse changeStatus(@PathVariable Long id, @Valid @RequestBody OrderStatusChangeRequest request) {
        Long actorId = SecurityUtils.requireCurrentUser().id();
        return orderService.changeStatus(id, request.status(), request.note(), actorId);
    }
}
