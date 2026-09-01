package com.stackflow.inventory.security;

import com.stackflow.inventory.user.domain.Role;
import com.stackflow.inventory.user.domain.User;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * The authenticated caller.
 *
 * <p>Carries the user id so services can attribute writes without a second database round-trip on
 * every request.
 */
public record UserPrincipal(Long id, String email, String password, Role role, boolean enabled)
        implements UserDetails {

    public static UserPrincipal from(User user) {
        return new UserPrincipal(
                user.getId(), user.getEmail(), user.getPasswordHash(), user.getRole(), user.isEnabled());
    }

    /** Builds a principal from JWT claims — no database access on the hot path. */
    public static UserPrincipal fromClaims(Long id, String email, Role role) {
        return new UserPrincipal(id, email, null, role, true);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
