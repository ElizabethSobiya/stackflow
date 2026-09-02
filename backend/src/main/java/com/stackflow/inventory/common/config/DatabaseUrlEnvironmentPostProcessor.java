package com.stackflow.inventory.common.config;

import java.util.HashMap;
import java.util.Map;
import org.apache.commons.logging.Log;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.boot.logging.DeferredLogFactory;
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
    private static final String PASSWORD_PLACEHOLDER = "[YOUR-PASSWORD]";

    private final Log log;

    /**
     * Spring supplies the factory. Logging is not initialised this early, so messages are deferred
     * and replayed once it is — which is the only way a problem here reaches the operator at all.
     */
    public DatabaseUrlEnvironmentPostProcessor(DeferredLogFactory logFactory) {
        this.log = logFactory.getLog(DatabaseUrlEnvironmentPostProcessor.class);
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String databaseUrl = environment.getProperty("DATABASE_URL");
        if (databaseUrl == null || databaseUrl.isBlank() || databaseUrl.startsWith("jdbc:")) {
            return;
        }

        DatabaseUrl.parse(databaseUrl).ifPresentOrElse(
                parsed -> contribute(environment, parsed),
                () -> warnAboutUnusableUrl(databaseUrl));
    }

    private void contribute(ConfigurableEnvironment environment, DatabaseUrl parsed) {
        Map<String, Object> properties = new HashMap<>();
        properties.put("DB_URL", parsed.jdbcUrl());
        if (parsed.username() != null) {
            properties.put("DB_USERNAME", parsed.username());
        }
        if (parsed.password() != null) {
            properties.put("DB_PASSWORD", parsed.password());
        }
        environment.getPropertySources().addLast(new MapPropertySource(PROPERTY_SOURCE_NAME, properties));
        log.info("Using the database at %s (translated from DATABASE_URL)".formatted(parsed.jdbcUrl()));
    }

    /**
     * Says so loudly instead of falling through to the local development default.
     *
     * <p>Silence here produces the single most confusing failure this application can have: an
     * operator sets DATABASE_URL, it cannot be parsed, the placeholder default points at localhost,
     * and the error that surfaces is "role does not exist" — which sends them looking at the remote
     * database that was never contacted.
     */
    private void warnAboutUnusableUrl(String databaseUrl) {
        if (databaseUrl.contains(PASSWORD_PLACEHOLDER)) {
            log.warn("DATABASE_URL still contains the literal " + PASSWORD_PLACEHOLDER
                    + " — replace it with the real database password. Falling back to the default"
                    + " datasource, which is almost certainly not what you want.");
            return;
        }
        log.warn("DATABASE_URL is set but could not be parsed, so it is being ignored and the default"
                + " datasource is used instead. Expected postgres://user:password@host:port/database"
                + " — percent-encode any of @ : / ? # in the password (@ becomes %40).");
    }
}
