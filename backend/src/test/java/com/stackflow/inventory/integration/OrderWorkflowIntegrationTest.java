package com.stackflow.inventory.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * End-to-end through the real HTTP stack, security filters and database: register, catalogue a
 * product, sell it, and prove the stock and the state machine behaved.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OrderWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Shared across the class on purpose: only the first account in a fresh database is promoted to
     * ADMIN, so every test in this class authenticates as that same operator.
     */
    private static String adminToken;

    @BeforeEach
    void registerAdmin() throws Exception {
        if (adminToken != null) {
            return;
        }
        String email = "admin-%s@stackflow.dev".formatted(System.nanoTime());
        JsonNode response = json(mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("email", email, "password", "Password123!", "fullName", "Ada Admin"))))
                .andExpect(status().isCreated())
                .andReturn());
        adminToken = response.get("accessToken").asText();
    }

    @Test
    @DisplayName("anonymous requests are rejected with the standard error shape")
    void protectedEndpointsRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_FAILED"));
    }

    @Test
    @DisplayName("confirming an order deducts stock; cancelling it gives the units back")
    void orderLifecycleMovesStock() throws Exception {
        long productId = createProduct("SKU-INT-%d".formatted(System.nanoTime()), 10);

        long orderId = json(mockMvc.perform(authed(post("/api/orders"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "customerName", "Acme Corp",
                                "items", java.util.List.of(Map.of("productId", productId, "quantity", 4))))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.totalAmount").value(400.00))
                .andReturn())
                .get("id")
                .asLong();

        assertThat(stockQuantity(productId)).isEqualTo(10);

        changeStatus(orderId, "CONFIRMED").andExpect(status().isOk());
        assertThat(stockQuantity(productId)).isEqualTo(6);

        changeStatus(orderId, "CANCELLED").andExpect(status().isOk());
        assertThat(stockQuantity(productId)).isEqualTo(10);
    }

    @Test
    @DisplayName("the server refuses transitions the state machine does not allow")
    void illegalTransitionsAreRejected() throws Exception {
        long productId = createProduct("SKU-INT-%d".formatted(System.nanoTime()), 5);
        long orderId = createOrder(productId, 1);

        changeStatus(orderId, "DELIVERED")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_STATUS_TRANSITION"));
    }

    @Test
    @DisplayName("an order larger than the stock on hand cannot be confirmed")
    void confirmingBeyondAvailableStockFails() throws Exception {
        long productId = createProduct("SKU-INT-%d".formatted(System.nanoTime()), 2);
        long orderId = createOrder(productId, 3);

        changeStatus(orderId, "CONFIRMED")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INSUFFICIENT_STOCK"));

        assertThat(stockQuantity(productId)).isEqualTo(2);
    }

    @Test
    void validationFailuresListTheOffendingFields() throws Exception {
        mockMvc.perform(authed(post("/api/products"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of("name", "", "category", "Test", "sku", "BAD SKU", "price", -1))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.fieldErrors").isArray());
    }

    private long createProduct(String sku, int quantity) throws Exception {
        return json(mockMvc.perform(authed(post("/api/products"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "name", "Integration Widget",
                                "category", "Test",
                                "sku", sku,
                                "price", 100.00,
                                "initialQuantity", quantity,
                                "lowStockThreshold", 2))))
                .andExpect(status().isCreated())
                .andReturn())
                .get("id")
                .asLong();
    }

    private long createOrder(long productId, int quantity) throws Exception {
        return json(mockMvc.perform(authed(post("/api/orders"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(Map.of(
                                "customerName", "Acme Corp",
                                "items", java.util.List.of(Map.of("productId", productId, "quantity", quantity))))))
                .andExpect(status().isCreated())
                .andReturn())
                .get("id")
                .asLong();
    }

    private org.springframework.test.web.servlet.ResultActions changeStatus(long orderId, String status)
            throws Exception {
        return mockMvc.perform(authed(patch("/api/orders/{id}/status", orderId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("status", status))));
    }

    private int stockQuantity(long productId) throws Exception {
        return json(mockMvc.perform(authed(get("/api/stock/{productId}", productId)))
                        .andExpect(status().isOk())
                        .andReturn())
                .get("quantity")
                .asInt();
    }

    private MockHttpServletRequestBuilder authed(MockHttpServletRequestBuilder builder) {
        return builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken);
    }

    private String body(Map<String, ?> payload) throws Exception {
        return objectMapper.writeValueAsString(payload);
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }
}
