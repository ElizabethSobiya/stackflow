package com.stackflow.inventory.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.stackflow.inventory.user.domain.Role;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class JwtTokenServiceTest {

    private static final String SECRET = "unit-test-secret-key-long-enough-for-hs256";

    private final JwtTokenService tokenService = new JwtTokenService(
            new JwtProperties("stackflow-test", SECRET, Duration.ofMinutes(15), Duration.ofDays(7)));

    @Test
    void issuedTokensRoundTripTheIdentity() {
        UserPrincipal principal = UserPrincipal.fromClaims(42L, "admin@stackflow.dev", Role.ADMIN);

        UserPrincipal parsed = tokenService.parseAccessToken(tokenService.issueAccessToken(principal));

        assertThat(parsed.id()).isEqualTo(42L);
        assertThat(parsed.email()).isEqualTo("admin@stackflow.dev");
        assertThat(parsed.role()).isEqualTo(Role.ADMIN);
        assertThat(parsed.getAuthorities()).extracting("authority").containsExactly("ROLE_ADMIN");
    }

    @Test
    void tokensSignedWithAnotherKeyAreRejected() {
        JwtTokenService attacker = new JwtTokenService(
                new JwtProperties("stackflow-test", "a-completely-different-secret-key-value", Duration.ofMinutes(15),
                        Duration.ofDays(7)));
        String forged = attacker.issueAccessToken(UserPrincipal.fromClaims(1L, "mallory@evil.example", Role.ADMIN));

        assertThatThrownBy(() -> tokenService.parseAccessToken(forged))
                .isInstanceOf(TokenService.InvalidTokenException.class);
    }

    @Test
    void expiredTokensAreRejected() {
        JwtTokenService shortLived = new JwtTokenService(
                new JwtProperties("stackflow-test", SECRET, Duration.ofSeconds(-1), Duration.ofDays(7)));
        String expired = shortLived.issueAccessToken(UserPrincipal.fromClaims(1L, "user@stackflow.dev", Role.STAFF));

        assertThatThrownBy(() -> tokenService.parseAccessToken(expired))
                .isInstanceOf(TokenService.InvalidTokenException.class);
    }

    @Test
    void garbageIsRejectedRatherThanTrusted() {
        assertThatThrownBy(() -> tokenService.parseAccessToken("not-a-jwt"))
                .isInstanceOf(TokenService.InvalidTokenException.class);
    }

    @Test
    void aWeakSecretFailsFastAtStartup() {
        assertThatThrownBy(() -> new JwtTokenService(
                        new JwtProperties("stackflow-test", "too-short", Duration.ofMinutes(15), Duration.ofDays(7))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes");
    }
}
