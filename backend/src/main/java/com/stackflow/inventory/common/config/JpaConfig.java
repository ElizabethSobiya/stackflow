package com.stackflow.inventory.common.config;

import com.stackflow.inventory.security.SecurityUtils;
import java.util.Optional;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaConfig {

    /** Supplies the acting user id to {@code @CreatedBy}/{@code @LastModifiedBy} fields. */
    @Bean
    public AuditorAware<Long> auditorAware() {
        return () -> Optional.ofNullable(SecurityUtils.currentUserIdOrNull());
    }
}
