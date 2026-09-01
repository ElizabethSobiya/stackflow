package com.stackflow.inventory.user.dto;

import com.stackflow.inventory.user.domain.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(@NotNull Role role) {}
