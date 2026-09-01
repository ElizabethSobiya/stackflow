package com.stackflow.inventory.auth.dto;

import com.stackflow.inventory.user.dto.UserResponse;

/**
 * @param expiresInSeconds lifetime of {@code accessToken}; the client refreshes before this elapses
 */
public record AuthResponse(String accessToken, String refreshToken, long expiresInSeconds, UserResponse user) {}
