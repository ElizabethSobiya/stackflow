package com.stackflow.inventory.bootstrap;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param enabled seed demo data on startup; only ever true in local/dev profiles
 */
@ConfigurationProperties(prefix = "stackflow.seed")
public record SeedProperties(boolean enabled) {}
