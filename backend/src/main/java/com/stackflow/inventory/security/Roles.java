package com.stackflow.inventory.security;

/** Authority names as Spring Security sees them — kept in one place to avoid typo-driven holes. */
public final class Roles {

    public static final String ADMIN = "ADMIN";
    public static final String STAFF = "STAFF";

    public static final String HAS_ADMIN = "hasRole('" + ADMIN + "')";
    public static final String HAS_ANY_ROLE = "hasAnyRole('" + ADMIN + "','" + STAFF + "')";

    private Roles() {}
}
