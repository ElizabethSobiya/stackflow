package com.stackflow.inventory.bootstrap;

import com.stackflow.inventory.catalog.dto.ProductRequest;
import com.stackflow.inventory.catalog.service.ProductService;
import com.stackflow.inventory.order.domain.OrderStatus;
import com.stackflow.inventory.order.dto.CreateOrderRequest;
import com.stackflow.inventory.order.dto.OrderItemRequest;
import com.stackflow.inventory.order.dto.OrderResponse;
import com.stackflow.inventory.order.service.OrderService;
import com.stackflow.inventory.user.domain.Role;
import com.stackflow.inventory.user.service.UserService;
import java.math.BigDecimal;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds a usable dataset the first time a dev database starts.
 *
 * <p>Guarded twice — {@code stackflow.seed.enabled} and an emptiness check — so it can never touch
 * an environment that already has data. Passwords are hashed through the real encoder rather than
 * pasted as literals into a migration, so rotating the hashing strategy needs no new migration.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private static final String ADMIN_EMAIL = "admin@stackflow.dev";
    private static final String STAFF_EMAIL = "staff@stackflow.dev";
    private static final String DEFAULT_PASSWORD = "Password123!";

    private final SeedProperties seedProperties;
    private final UserService userService;
    private final ProductService productService;
    private final OrderService orderService;

    @Override
    public void run(ApplicationArguments args) {
        if (!seedProperties.enabled()) {
            return;
        }
        if (userService.countUsers() > 0) {
            log.debug("Seed skipped: database already contains users");
            return;
        }

        userService.register(ADMIN_EMAIL, DEFAULT_PASSWORD, "Ada Admin", Role.ADMIN);
        userService.register(STAFF_EMAIL, DEFAULT_PASSWORD, "Sam Staff", Role.STAFF);

        var laptop = productService.create(new ProductRequest(
                "Aurora 14\" Laptop", "14-inch ultrabook, 16GB RAM, 512GB SSD", "Electronics",
                "ELEC-LAP-001", new BigDecimal("1299.00"), 24, 5));
        var monitor = productService.create(new ProductRequest(
                "Lumen 27\" 4K Monitor", "27-inch 4K IPS display with USB-C", "Electronics",
                "ELEC-MON-027", new BigDecimal("449.50"), 12, 4));
        var keyboard = productService.create(new ProductRequest(
                "Tactile Mechanical Keyboard", "Hot-swappable switches, compact 75% layout", "Accessories",
                "ACC-KEY-075", new BigDecimal("129.99"), 3, 6));
        var chair = productService.create(new ProductRequest(
                "Ergo Task Chair", "Mesh back, adjustable lumbar support", "Furniture",
                "FURN-CHR-010", new BigDecimal("389.00"), 8, 3));
        productService.create(new ProductRequest(
                "Standing Desk 160cm", "Electric height-adjustable desk", "Furniture",
                "FURN-DSK-160", new BigDecimal("749.00"), 5, 2));
        productService.create(new ProductRequest(
                "USB-C Dock 11-in-1", "Dual HDMI, Ethernet, 100W passthrough", "Accessories",
                "ACC-DCK-011", new BigDecimal("189.00"), 2, 5));

        OrderResponse delivered = orderService.create(new CreateOrderRequest(
                "Northwind Trading", "orders@northwind.example", "Priority customer",
                List.of(new OrderItemRequest(laptop.id(), 2), new OrderItemRequest(monitor.id(), 2))));
        advance(delivered.id(), OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED);

        OrderResponse shipped = orderService.create(new CreateOrderRequest(
                "Contoso Ltd", "buying@contoso.example", null,
                List.of(new OrderItemRequest(chair.id(), 3))));
        advance(shipped.id(), OrderStatus.CONFIRMED, OrderStatus.SHIPPED);

        OrderResponse confirmed = orderService.create(new CreateOrderRequest(
                "Fabrikam Inc", "supply@fabrikam.example", "Split shipment requested",
                List.of(new OrderItemRequest(keyboard.id(), 1), new OrderItemRequest(monitor.id(), 1))));
        advance(confirmed.id(), OrderStatus.CONFIRMED);

        orderService.create(new CreateOrderRequest(
                "Tailspin Toys", "ops@tailspin.example", null,
                List.of(new OrderItemRequest(laptop.id(), 1))));

        log.info("Seeded dev data — sign in as {} or {} with password '{}'", ADMIN_EMAIL, STAFF_EMAIL,
                DEFAULT_PASSWORD);
    }

    private void advance(Long orderId, OrderStatus... statuses) {
        for (OrderStatus status : statuses) {
            orderService.changeStatus(orderId, status, "Seeded", null);
        }
    }
}
