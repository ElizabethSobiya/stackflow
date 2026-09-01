package com.stackflow.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point for the StackFlow inventory / order management API.
 *
 * <p>The codebase is organised <em>package-by-feature</em> ({@code catalog}, {@code stock},
 * {@code order}, ...). Each feature owns its domain, persistence, service and web layers, and
 * exposes a narrow service interface that other features may depend on. That keeps the blast
 * radius of a change inside one package and makes extracting a feature into its own deployable
 * a mechanical move rather than a rewrite.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class InventoryApplication {

    public static void main(String[] args) {
        SpringApplication.run(InventoryApplication.class, args);
    }
}
