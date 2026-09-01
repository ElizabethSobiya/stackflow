package com.stackflow.inventory.security;

import com.stackflow.inventory.common.exception.AuthenticationFailedException;
import java.util.Optional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Read-only access to the current {@link UserPrincipal}. */
public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<UserPrincipal> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        return authentication.getPrincipal() instanceof UserPrincipal principal
                ? Optional.of(principal)
                : Optional.empty();
    }

    public static UserPrincipal requireCurrentUser() {
        return currentUser().orElseThrow(() -> new AuthenticationFailedException("No authenticated user"));
    }

    public static Long currentUserIdOrNull() {
        return currentUser().map(UserPrincipal::id).orElse(null);
    }
}
