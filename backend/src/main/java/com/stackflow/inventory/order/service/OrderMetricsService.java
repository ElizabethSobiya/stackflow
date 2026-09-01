package com.stackflow.inventory.order.service;

import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.repository.OrderRepository;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderMetricsService implements OrderMetrics {

    private static final Set<OrderStatus> REVENUE_STATUSES =
            Set.of(OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED);

    private final OrderRepository orderRepository;
    private final Clock clock;

    @Override
    public long totalOrders() {
        return orderRepository.count();
    }

    @Override
    public Map<OrderStatus, Long> countByStatus() {
        Map<OrderStatus, Long> counts = new EnumMap<>(OrderStatus.class);
        for (OrderStatus status : OrderStatus.values()) {
            counts.put(status, 0L);
        }
        orderRepository.countGroupedByStatus().forEach(row -> counts.put(row.getStatus(), row.getCount()));
        return counts;
    }

    @Override
    public BigDecimal revenueSince(Instant from) {
        BigDecimal revenue = orderRepository.sumRevenueSince(REVENUE_STATUSES, from);
        return revenue != null ? revenue : BigDecimal.ZERO;
    }

    /**
     * Bucketed in Java rather than SQL: the window is a handful of days of rows, and keeping
     * {@code date_trunc} out of the query means the same code runs on any database. Swap in a
     * grouped query here if the window ever grows.
     */
    @Override
    public List<DailyRevenue> dailyRevenueSince(Instant from) {
        Map<LocalDate, BigDecimal> totals = new HashMap<>();
        orderRepository.findRevenuePointsSince(REVENUE_STATUSES, from).forEach(point -> {
            LocalDate day = point.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
            totals.merge(day, point.getAmount(), BigDecimal::add);
        });

        LocalDate start = from.atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        List<DailyRevenue> series = new ArrayList<>();
        for (LocalDate day = start; !day.isAfter(today); day = day.plusDays(1)) {
            series.add(new DailyRevenue(day, totals.getOrDefault(day, BigDecimal.ZERO)));
        }
        return series;
    }
}
