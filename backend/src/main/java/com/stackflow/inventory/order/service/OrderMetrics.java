package com.stackflow.inventory.order.service;

import com.stackflow.inventory.order.domain.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Read-only aggregates over orders.
 *
 * <p>Separate from {@link OrderService} on purpose: the dashboard needs numbers, not the ability to
 * mutate orders, and a narrow interface makes that impossible to get wrong.
 */
public interface OrderMetrics {

    long totalOrders();

    Map<OrderStatus, Long> countByStatus();

    BigDecimal revenueSince(Instant from);

    /** Daily revenue totals from {@code from} until today, with zero-filled gaps. */
    List<DailyRevenue> dailyRevenueSince(Instant from);

    record DailyRevenue(LocalDate date, BigDecimal amount) {}
}
