package com.stackflow.inventory.stock.web;

import com.stackflow.inventory.common.api.PageResponse;
import com.stackflow.inventory.security.Roles;
import com.stackflow.inventory.stock.dto.StockAdjustmentRequest;
import com.stackflow.inventory.stock.dto.StockItemResponse;
import com.stackflow.inventory.stock.dto.StockMovementResponse;
import com.stackflow.inventory.stock.dto.StockThresholdRequest;
import com.stackflow.inventory.stock.service.StockService;
import com.stackflow.inventory.stock.service.StockView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Stock", description = "Stock levels, adjustments and movement history")
@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockService stockService;

    @GetMapping("/low")
    @Operation(summary = "Products at or below their low-stock threshold")
    public PageResponse<StockItemResponse> lowStock(
            @PageableDefault(size = 20, sort = "quantity", direction = Sort.Direction.ASC) Pageable pageable) {
        return PageResponse.of(stockService.findLowStock(pageable), StockItemResponse::from);
    }

    @GetMapping("/{productId}")
    public StockView get(@PathVariable Long productId) {
        return stockService.getByProductId(productId);
    }

    @GetMapping("/{productId}/movements")
    @Operation(summary = "Audit trail of every change to this product's stock")
    public PageResponse<StockMovementResponse> movements(
            @PathVariable Long productId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(stockService.findMovements(productId, pageable), StockMovementResponse::from);
    }

    @PostMapping("/{productId}/adjust")
    @PreAuthorize(Roles.HAS_ANY_ROLE)
    @Operation(summary = "Apply a signed stock adjustment, recording the reason")
    public StockView adjust(@PathVariable Long productId, @Valid @RequestBody StockAdjustmentRequest request) {
        return stockService.adjust(productId, request.delta(), request.reason(), request.note(), null);
    }

    @PutMapping("/{productId}/threshold")
    @PreAuthorize(Roles.HAS_ADMIN)
    @Operation(summary = "Change the low-stock threshold for a product")
    public StockView changeThreshold(
            @PathVariable Long productId, @Valid @RequestBody StockThresholdRequest request) {
        stockService.changeThreshold(productId, request.lowStockThreshold());
        return stockService.getByProductId(productId);
    }
}
