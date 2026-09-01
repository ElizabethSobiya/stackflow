package com.stackflow.inventory.dashboard.service;

import com.stackflow.inventory.catalog.service.ProductService;
import com.stackflow.inventory.dashboard.dto.DashboardSummaryResponse;
import com.stackflow.inventory.order.dto.OrderSearchCriteria;
import com.stackflow.inventory.order.service.OrderMetrics;
import com.stackflow.inventory.order.service.OrderService;
import com.stackflow.inventory.stock.service.StockService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Composes the dashboard from other features' public interfaces only — it owns no tables of its
 * own. If any of these numbers later needs to come from a cache or a read replica, it changes here
 * and nowhere else.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private static final Duration REVENUE_WINDOW = Duration.ofDays(7);
    private static final int RECENT_ORDER_COUNT = 5;

    private final OrderMetrics orderMetrics;
    private final OrderService orderService;
    private final StockService stockService;
    private final ProductService productService;
    private final Clock clock;

    @Override
    public DashboardSummaryResponse summary() {
        Instant windowStart = Instant.now(clock).minus(REVENUE_WINDOW);

        List<DashboardSummaryResponse.RevenuePoint> series = orderMetrics.dailyRevenueSince(windowStart).stream()
                .map(point -> new DashboardSummaryResponse.RevenuePoint(point.date(), point.amount()))
                .toList();

        var recent = orderService
                .search(
                        OrderSearchCriteria.empty(),
                        PageRequest.of(0, RECENT_ORDER_COUNT, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();

        return new DashboardSummaryResponse(
                orderMetrics.totalOrders(),
                orderMetrics.countByStatus(),
                orderMetrics.revenueSince(windowStart),
                stockService.countLowStock(),
                productService.countActive(),
                stockService.totalUnitsOnHand(),
                series,
                recent);
    }
}
