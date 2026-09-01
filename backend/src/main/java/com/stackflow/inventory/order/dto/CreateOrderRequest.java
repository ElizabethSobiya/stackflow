package com.stackflow.inventory.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CreateOrderRequest(
        @NotBlank @Size(max = 160) String customerName,
        @Email @Size(max = 255) String customerEmail,
        @Size(max = 500) String notes,
        @NotEmpty(message = "An order needs at least one item") @Valid List<OrderItemRequest> items) {}
