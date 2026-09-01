package com.stackflow.inventory.user.service;

import com.stackflow.inventory.common.exception.ConflictException;
import com.stackflow.inventory.common.exception.ResourceNotFoundException;
import com.stackflow.inventory.user.domain.Role;
import com.stackflow.inventory.user.domain.User;
import com.stackflow.inventory.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public User register(String email, String rawPassword, String fullName, Role role) {
        String normalisedEmail = email.trim().toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(normalisedEmail)) {
            throw new ConflictException("An account with this email already exists");
        }
        User user = User.builder()
                .email(normalisedEmail)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName.trim())
                .role(role)
                .build();
        User saved = userRepository.save(user);
        log.info("Registered user {} with role {}", saved.getId(), saved.getRole());
        return saved;
    }

    @Override
    public User getById(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }

    @Override
    public User getByEmail(String email) {
        return userRepository
                .findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> ResourceNotFoundException.of("User", email));
    }

    @Override
    public Page<User> findAll(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    @Override
    @Transactional
    public User changeRole(Long userId, Role role) {
        User user = getById(userId);
        user.changeRole(role);
        return user;
    }

    @Override
    @Transactional
    public User setEnabled(Long userId, boolean enabled) {
        User user = getById(userId);
        if (enabled) {
            user.enable();
        } else {
            user.disable();
        }
        return user;
    }

    @Override
    public long countUsers() {
        return userRepository.count();
    }
}
