package com.stackflow.inventory.auth.service;

import com.stackflow.inventory.auth.domain.RefreshToken;
import com.stackflow.inventory.user.domain.User;

public interface RefreshTokenService {

    /** @return the raw token to hand to the client; only its hash is persisted */
    String issue(User user);

    /**
     * Consumes a refresh token and issues a replacement (rotation).
     *
     * @throws com.stackflow.inventory.common.exception.AuthenticationFailedException if the token is
     *     unknown, expired or already used
     */
    RefreshToken consume(String rawToken);

    void revokeAllForUser(Long userId);

    int purgeExpired();
}
