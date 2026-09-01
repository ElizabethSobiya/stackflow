package com.stackflow.inventory.auth.service;

import com.stackflow.inventory.auth.domain.RefreshToken;
import com.stackflow.inventory.auth.dto.AuthResponse;
import com.stackflow.inventory.auth.dto.LoginRequest;
import com.stackflow.inventory.auth.dto.RegisterRequest;
import com.stackflow.inventory.common.exception.AuthenticationFailedException;
import com.stackflow.inventory.security.TokenService;
import com.stackflow.inventory.security.UserPrincipal;
import com.stackflow.inventory.user.domain.Role;
import com.stackflow.inventory.user.domain.User;
import com.stackflow.inventory.user.dto.UserResponse;
import com.stackflow.inventory.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserService userService;
    private final TokenService tokenService;
    private final RefreshTokenService refreshTokenService;
    private final AuthenticationManager authenticationManager;

    /**
     * The very first account to register becomes the ADMIN, so a fresh deployment is usable without
     * seeding credentials by hand. Every later self-registration is STAFF; promotion is an admin
     * action.
     */
    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        Role role = userService.countUsers() == 0 ? Role.ADMIN : Role.STAFF;
        User user = userService.register(request.email(), request.password(), request.fullName(), role);
        return issueTokens(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().trim(), request.password()));
        } catch (AuthenticationException ex) {
            log.debug("Failed login attempt for {}", request.email());
            // Deliberately identical message for unknown email and wrong password.
            throw new AuthenticationFailedException("Invalid email or password");
        }
        return issueTokens(userService.getByEmail(request.email()));
    }

    @Override
    @Transactional
    public AuthResponse refresh(String refreshToken) {
        RefreshToken consumed = refreshTokenService.consume(refreshToken);
        User user = consumed.getUser();
        if (!user.isEnabled()) {
            throw new AuthenticationFailedException("Account is disabled");
        }
        return issueTokens(user);
    }

    @Override
    @Transactional
    public void logout(Long userId) {
        refreshTokenService.revokeAllForUser(userId);
    }

    private AuthResponse issueTokens(User user) {
        String accessToken = tokenService.issueAccessToken(UserPrincipal.from(user));
        String refreshToken = refreshTokenService.issue(user);
        return new AuthResponse(
                accessToken,
                refreshToken,
                tokenService.accessTokenTtl().toSeconds(),
                UserResponse.from(user));
    }
}
