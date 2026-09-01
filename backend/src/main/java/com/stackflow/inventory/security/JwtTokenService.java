package com.stackflow.inventory.security;

import com.stackflow.inventory.user.domain.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

/** HS256 JWT implementation of {@link TokenService}. */
@Service
public class JwtTokenService implements TokenService {

    private static final String CLAIM_USER_ID = "uid";
    private static final String CLAIM_ROLE = "role";
    private static final int MIN_SECRET_BYTES = 32;

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtTokenService(JwtProperties properties) {
        byte[] secretBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "stackflow.security.jwt.secret must be at least %d bytes for HS256".formatted(MIN_SECRET_BYTES));
        }
        this.properties = properties;
        this.signingKey = Keys.hmacShaKeyFor(secretBytes);
    }

    @Override
    public String issueAccessToken(UserPrincipal principal) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(properties.issuer())
                .subject(principal.email())
                .claim(CLAIM_USER_ID, principal.id())
                .claim(CLAIM_ROLE, principal.role().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTokenTtl())))
                .signWith(signingKey)
                .compact();
    }

    @Override
    public UserPrincipal parseAccessToken(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .requireIssuer(properties.issuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return UserPrincipal.fromClaims(
                    claims.get(CLAIM_USER_ID, Number.class).longValue(),
                    claims.getSubject(),
                    Role.valueOf(claims.get(CLAIM_ROLE, String.class)));
        } catch (JwtException | IllegalArgumentException ex) {
            throw new InvalidTokenException("Access token is not valid", ex);
        }
    }

    @Override
    public Duration accessTokenTtl() {
        return properties.accessTokenTtl();
    }
}
