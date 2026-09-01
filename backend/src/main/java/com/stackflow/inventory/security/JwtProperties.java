package com.stackflow.inventory.security;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * @param secret HMAC signing key; must be at least 32 bytes for HS256
 * @param accessTokenTtl deliberately short — revocation is handled by expiry plus refresh rotation
 * @param refreshTokenTtl lifetime of the opaque, database-backed refresh token
 */
@Validated
@ConfigurationProperties(prefix = "stackflow.security.jwt")
public record JwtProperties(
        @NotBlank String issuer,
        @NotBlank String secret,
        @NotNull Duration accessTokenTtl,
        @NotNull Duration refreshTokenTtl) {}
