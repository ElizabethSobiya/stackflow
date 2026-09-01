package com.stackflow.inventory.auth.service;

import com.stackflow.inventory.auth.dto.AuthResponse;
import com.stackflow.inventory.auth.dto.LoginRequest;
import com.stackflow.inventory.auth.dto.RegisterRequest;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    /** Rotates the refresh token and issues a fresh access token. */
    AuthResponse refresh(String refreshToken);

    void logout(Long userId);
}
