package com.stackflow.inventory.user.service;

import com.stackflow.inventory.user.domain.Role;
import com.stackflow.inventory.user.domain.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {

    /**
     * @throws com.stackflow.inventory.common.exception.ConflictException if the email is taken
     */
    User register(String email, String rawPassword, String fullName, Role role);

    User getById(Long id);

    User getByEmail(String email);

    Page<User> findAll(Pageable pageable);

    User changeRole(Long userId, Role role);

    User setEnabled(Long userId, boolean enabled);

    long countUsers();
}
