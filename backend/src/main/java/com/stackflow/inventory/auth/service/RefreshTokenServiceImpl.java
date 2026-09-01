package com.stackflow.inventory.auth.service;

import com.stackflow.inventory.auth.domain.RefreshToken;
import com.stackflow.inventory.auth.repository.RefreshTokenRepository;
import com.stackflow.inventory.common.exception.AuthenticationFailedException;
import com.stackflow.inventory.security.JwtProperties;
import com.stackflow.inventory.user.domain.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    @Transactional
    public String issue(User user) {
        String rawToken = generateRawToken();
        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .expiresAt(Instant.now().plus(jwtProperties.refreshTokenTtl()))
                .build());
        return rawToken;
    }

    @Override
    @Transactional
    public RefreshToken consume(String rawToken) {
        RefreshToken token = refreshTokenRepository
                .findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new AuthenticationFailedException("Refresh token is not valid"));

        if (!token.isActive(Instant.now())) {
            // A replayed token is the signature of a stolen credential: drop the whole family.
            refreshTokenRepository.revokeAllForUser(token.getUser().getId(), Instant.now());
            log.warn("Refresh token replay or expiry for user {} — all sessions revoked", token.getUser().getId());
            throw new AuthenticationFailedException("Refresh token is expired or already used");
        }
        token.revoke();
        return token;
    }

    @Override
    @Transactional
    public void revokeAllForUser(Long userId) {
        int revoked = refreshTokenRepository.revokeAllForUser(userId, Instant.now());
        log.debug("Revoked {} refresh token(s) for user {}", revoked, userId);
    }

    @Override
    @Transactional
    public int purgeExpired() {
        return refreshTokenRepository.deleteExpiredBefore(Instant.now());
    }

    private String generateRawToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is required but unavailable", ex);
        }
    }
}
