package com.stackflow.inventory.user.web;

import com.stackflow.inventory.common.api.PageResponse;
import com.stackflow.inventory.security.Roles;
import com.stackflow.inventory.user.dto.UpdateUserRoleRequest;
import com.stackflow.inventory.user.dto.UserResponse;
import com.stackflow.inventory.user.service.UserService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Users", description = "User administration (admin only)")
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize(Roles.HAS_ADMIN)
public class UserController {

    private final UserService userService;

    @GetMapping
    public PageResponse<UserResponse> list(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(userService.findAll(pageable), UserResponse::from);
    }

    @PatchMapping("/{id}/role")
    public UserResponse changeRole(@PathVariable Long id, @Valid @RequestBody UpdateUserRoleRequest request) {
        return UserResponse.from(userService.changeRole(id, request.role()));
    }

    @PatchMapping("/{id}/enabled")
    public UserResponse setEnabled(@PathVariable Long id, @RequestParam boolean value) {
        return UserResponse.from(userService.setEnabled(id, value));
    }
}
