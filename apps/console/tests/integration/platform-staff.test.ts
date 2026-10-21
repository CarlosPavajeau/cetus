import { describe, expect, test } from "vitest";

import { createOrganization } from "../support/organization";
import { createPlatformStaff, jwtClaims } from "../support/platform-staff";

// Platform roles reach the API only through the JWT's `groups` claim, and only with 2FA enabled.
describe("platform staff", () => {
  test("an admin with 2FA gets the admin group and reaches the administration API", async () => {
    const admin = await createPlatformStaff("admin");

    expect(jwtClaims(await admin.token())).toMatchObject({
      groups: ["admin"],
      impersonatedBy: null,
    });
    const me = await admin.api("/admin/me");
    expect(me.status).toBe(200);
    expect(await me.json()).toMatchObject({ roles: ["admin"] });
    expect((await admin.authResponse("/admin/list-users?limit=1")).status).toBe(200);
  });

  test("staff without 2FA get no group and Better Auth refuses its admin endpoints", async () => {
    const admin = await createPlatformStaff("admin", { twoFactor: false });

    expect(jwtClaims(await admin.token())).toMatchObject({ groups: [] });
    expect((await admin.api("/admin/me")).status).toBe(403);
    const listUsers = await admin.authResponse("/admin/list-users?limit=1");
    expect(listUsers.status).toBe(403);
    expect(await listUsers.json()).toMatchObject({ code: "TWO_FACTOR_REQUIRED" });
  });

  test("support reads users but cannot ban them", async () => {
    const support = await createPlatformStaff("support");
    const customer = await createOrganization("Cliente SAS");
    const { users } = await support.auth<{ users: { id: string; email: string }[] }>(
      `/admin/list-users?searchField=email&searchValue=${encodeURIComponent(customer.email)}`,
    );
    const target = users.find((user) => user.email === customer.email);
    expect(target).toBeDefined();

    expect((await support.api("/admin/me")).status).toBe(200);
    const ban = await support.authResponse("/admin/ban-user", { userId: target!.id });
    expect(ban.status).toBe(403);
  });

  test("admin changes are refused over HTTP: they go through the console, which audits them", async () => {
    const admin = await createPlatformStaff("admin");
    const customer = await createOrganization("Cliente SAS");
    const { users } = await admin.auth<{ users: { id: string; email: string }[] }>(
      `/admin/list-users?searchField=email&searchValue=${encodeURIComponent(customer.email)}`,
    );

    for (const [path, body] of [
      ["/admin/ban-user", { userId: users[0]!.id }],
      ["/admin/set-role", { userId: users[0]!.id, role: "admin" }],
      ["/admin/impersonate-user", { userId: users[0]!.id }],
      ["/admin/remove-user", { userId: users[0]!.id }],
    ] as const) {
      const response = await admin.authResponse(path, body);
      expect(response.status, path).toBe(403);
      expect(await response.json()).toMatchObject({ code: "USE_THE_ADMINISTRATION" });
    }
    expect((await customer.api("/console/account")).status).toBe(200);
  });

  test("a customer with 2FA is still not staff", async () => {
    const customer = await createOrganization("Cliente SAS");
    const { totpURI } = await customer.auth<{ totpURI: string }>("/two-factor/enable", {
      password: customer.password,
    });
    expect(totpURI).toContain("otpauth://totp/");

    expect(jwtClaims(await customer.token())).toMatchObject({ groups: [] });
    expect((await customer.api("/admin/me")).status).toBe(403);
    expect((await customer.authResponse("/admin/list-users?limit=1")).status).toBe(403);
  });
});
