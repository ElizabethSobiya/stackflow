package com.stackflow.inventory.auth.web;

import com.stackflow.inventory.auth.dto.AuthResponse;
import com.stackflow.inventory.auth.dto.LoginRequest;
import com.stackflow.inventory.auth.dto.RefreshRequest;
import com.stackflow.inventory.auth.dto.RegisterRequest;
import com.stackflow.inventory.auth.service.AuthService;
import com.stackflow.inventory.security.SecurityUtils;
import com.stackflow.inventory.user.dto.UserResponse;
import com.stackflow.inventory.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Authentication")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    @SecurityRequirements
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register an account (the first account created becomes ADMIN)")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @SecurityRequirements
    @PostMapping("/login")
    @Operation(summary = "Exchange credentials for an access + refresh token pair")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @SecurityRequirements
    @PostMapping("/refresh")
    @Operation(summary = "Rotate a refresh token for a new token pair")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke every refresh token for the current user")
    public void logout() {
        authService.logout(SecurityUtils.requireCurrentUser().id());
    }

    @GetMapping("/me")
    @Operation(summary = "The currently authenticated user")
    public UserResponse me() {
        return UserResponse.from(userService.getById(SecurityUtils.requireCurrentUser().id()));
    }
}
