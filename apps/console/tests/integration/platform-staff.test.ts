import { describe, expect, test } from "vite-plus/test";

import { createOrganization } from "../support/organization";
import { createPlatformStaff, enableTwoFactor, jwtClaims } from "../support/platform-staff";

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

  test("a customer with 2FA is still not staff", async () => {
    const customer = await createOrganization("Cliente SAS");
    await enableTwoFactor(customer);
    const session = await customer.auth<{ user: { twoFactorEnabled: boolean } }>("/get-session");
    expect(session.user.twoFactorEnabled).toBe(true);

    expect(jwtClaims(await customer.token())).toMatchObject({ groups: [] });
    expect((await customer.api("/admin/me")).status).toBe(403);
    expect((await customer.authResponse("/admin/list-users?limit=1")).status).toBe(403);
  });
});
