package com.stackflow.inventory.dashboard.dto;

import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.dto.OrderSummaryResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Everything the dashboard screen needs, in one round-trip. */
public record DashboardSummaryResponse(
        long totalOrders,
        Map<OrderStatus, Long> ordersByStatus,
        BigDecimal revenueThisWeek,
        long lowStockCount,
        long activeProducts,
        long unitsOnHand,
        List<RevenuePoint> revenueSeries,
        List<OrderSummaryResponse> recentOrders) {

    public record RevenuePoint(LocalDate date, BigDecimal amount) {}
}
