package com.stackflow.inventory.common.config;

import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Contributes {@code DB_URL} / {@code DB_USERNAME} / {@code DB_PASSWORD} from a platform-injected
 * {@code DATABASE_URL}, before any bean is created.
 *
 * <p>Registered as an {@code EnvironmentPostProcessor} rather than a {@code @Bean} because Flyway
 * and the DataSource are built while the context starts — by the time a bean could run, the
 * connection has already been attempted.
 *
 * <p>The values are added as the <em>lowest</em>-precedence property source, so an explicitly set
 * {@code DB_URL} always wins. That keeps local development (which sets {@code DB_URL} directly)
 * working unchanged while a platform that only offers {@code DATABASE_URL} works with no extra
 * configuration.
 */
public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor {

    static final String PROPERTY_SOURCE_NAME = "stackflow-database-url";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        DatabaseUrl.parse(databaseUrl).ifPresent(parsed -> {
            Map<String, Object> properties = new HashMap<>();
            properties.put("DB_URL", parsed.jdbcUrl());
            if (parsed.username() != null) {
                properties.put("DB_USERNAME", parsed.username());
            }
            if (parsed.password() != null) {
                properties.put("DB_PASSWORD", parsed.password());
            }
            environment.getPropertySources().addLast(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
        });
    }
}
