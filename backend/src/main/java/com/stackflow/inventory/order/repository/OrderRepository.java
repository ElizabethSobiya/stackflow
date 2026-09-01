package com.stackflow.inventory.order.repository;

import com.stackflow.inventory.order.domain.Order;
import com.stackflow.inventory.order.domain.OrderStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {

    /** Detail view: pulls the lines in the same round-trip instead of one query per line. */
    @EntityGraph(attributePaths = {"items", "items.product"})
    Optional<Order> findWithItemsById(Long id);

    Optional<Order> findByOrderNumber(String orderNumber);

    boolean existsByOrderNumber(String orderNumber);

    long countByStatus(OrderStatus status);

    @Query("select coalesce(sum(o.totalAmount), 0) from Order o "
            + "where o.status in :statuses and o.createdAt >= :from")
    BigDecimal sumRevenueSince(
            @Param("statuses") Collection<OrderStatus> statuses, @Param("from") Instant from);

    @Query("select o.status as status, count(o) as count from Order o group by o.status")
    List<StatusCount> countGroupedByStatus();

    @Query("select o.createdAt as createdAt, o.totalAmount as amount from Order o "
            + "where o.status in :statuses and o.createdAt >= :from")
    List<RevenuePoint> findRevenuePointsSince(
            @Param("statuses") Collection<OrderStatus> statuses, @Param("from") Instant from);

    /** One query for the unit counts of a page of orders — avoids an N+1 over order items. */
    @Query("select oi.order.id as orderId, sum(oi.quantity) as units from OrderItem oi "
            + "where oi.order.id in :orderIds group by oi.order.id")
    List<OrderUnitCount> countUnitsByOrderIds(@Param("orderIds") Collection<Long> orderIds);

    /** Projection interfaces keep aggregate queries type-safe without a DTO constructor expression. */
    interface StatusCount {
        OrderStatus getStatus();

        long getCount();
    }

    interface RevenuePoint {
        Instant getCreatedAt();

        BigDecimal getAmount();
    }

    interface OrderUnitCount {
        Long getOrderId();

        long getUnits();
    }
}
