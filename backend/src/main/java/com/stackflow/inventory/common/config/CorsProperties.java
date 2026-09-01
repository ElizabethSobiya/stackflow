package com.stackflow.inventory.common.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * @param allowedOrigins exact origins allowed to call the API — wildcards are rejected because the
 *     API is used with credentials-bearing requests.
 */
@ConfigurationProperties(prefix = "stackflow.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
