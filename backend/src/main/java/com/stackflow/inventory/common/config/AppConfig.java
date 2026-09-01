package com.stackflow.inventory.common.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    /** Injected rather than calling {@code Instant.now()} inline, so time can be fixed in tests. */
    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
