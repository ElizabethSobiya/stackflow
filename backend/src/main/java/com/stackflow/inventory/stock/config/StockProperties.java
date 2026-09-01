package com.stackflow.inventory.stock.config;

import jakarta.validation.constraints.Min;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * @param defaultLowStockThreshold applied when a product is created without an explicit threshold
 * @param optimisticLockRetries attempts before a concurrent stock write is reported to the caller
 */
@Validated
@ConfigurationProperties(prefix = "stackflow.stock")
public record StockProperties(@Min(0) int defaultLowStockThreshold, @Min(1) int optimisticLockRetries) {}
