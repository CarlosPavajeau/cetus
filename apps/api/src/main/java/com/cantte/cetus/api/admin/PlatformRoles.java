package com.cantte.cetus.api.admin;

/**
 * Roles of the Cetus team, carried in the JWT's "groups" claim. The console only emits them for staff
 * with 2FA enabled. {@code support} reads and assists; {@code admin} can also suspend, ban and impersonate.
 */
public final class PlatformRoles {

    public static final String ADMIN = "admin";
    public static final String SUPPORT = "support";

    private PlatformRoles() {}
}
