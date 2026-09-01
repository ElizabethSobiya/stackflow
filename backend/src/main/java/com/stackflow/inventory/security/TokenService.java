package com.stackflow.inventory.security;

import java.time.Duration;

/**
 * Issues and verifies access tokens.
 *
 * <p>An interface, not the JWT class itself: swapping HS256 for RS256 — or for opaque tokens backed
 * by an introspection endpoint — should touch one implementation, not every caller.
 */
public interface TokenService {

    String issueAccessToken(UserPrincipal principal);

    /**
     * @return the principal encoded in the token
     * @throws InvalidTokenException if the token is malformed, expired, or has a bad signature
     */
    UserPrincipal parseAccessToken(String token);

    Duration accessTokenTtl();

    class InvalidTokenException extends RuntimeException {
        public InvalidTokenException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
