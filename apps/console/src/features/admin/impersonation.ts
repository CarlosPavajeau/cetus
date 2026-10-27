import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";

import { api } from "~/lib/api/client";
import { impersonationSeconds, platformRole } from "~/lib/auth/permissions";
import { member, session as sessionTable, user } from "~/lib/auth/schema";
import { auth } from "~/lib/auth/server";
import { db } from "~/lib/db";

import { impersonationSchema } from "./schema";
import { requireStaff } from "./server";

/**
 * Starts acting as a console user in one of their organizations. The start is recorded first, on that
 * organization's account; then Better Auth swaps the admin's session cookie for one of the user, flagged
 * with `impersonatedBy`, and keeps the admin's session aside until the impersonation ends.
 */
export const startImpersonation = createServerFn({ method: "POST" })
  .validator(impersonationSchema)
  .handler(async ({ data }) => {
    const { session, headers } = await requireStaff("admin");
    const [target] = await db
      .select({ id: user.id, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.id, data.userId));
    if (!target) {
      throw new Error("No existe ese usuario.");
    }
    if (target.id === session.user.id || platformRole(target.role)) {
      throw new Error("No se puede ver la consola como un miembro del equipo de Cetus.");
    }
    const [membership] = await db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.userId, target.id), eq(member.organizationId, data.organizationId)));
    if (!membership) {
      throw new Error("La persona no pertenece a esa organización.");
    }
    const { items } = await api.get("/admin/accounts", {
      params: { query: { organizationId: [data.organizationId], limit: 1 } },
    });
    const account = items[0];
    if (!account) {
      throw new Error("La organización todavía no tiene una cuenta de Cetus.");
    }

    await api.post("/admin/impersonations", {
      body: {
        userId: target.id,
        email: target.email,
        accountId: account.id,
        reason: data.reason,
        expiresAt: new Date(Date.now() + impersonationSeconds * 1000).toISOString(),
      },
    });
    const started = await auth.api.impersonateUser({ headers, body: { userId: target.id } });
    // The new session starts without an organization, and the API scopes everything by it.
    await db
      .update(sessionTable)
      .set({ activeOrganizationId: data.organizationId })
      .where(eq(sessionTable.id, started.session.id));
  });

/** Ends the impersonation and restores the admin's own session; returns who was impersonated. */
export const stopImpersonation = createServerFn({ method: "POST" }).handler(async () => {
  const headers = new Headers(getRequestHeaders());
  const current = await auth.api.getSession({ headers });
  if (!current?.session.impersonatedBy) {
    throw new Error("No estás viendo la consola como otra persona.");
  }
  try {
    await api.post("/console/impersonation/end");
  } catch (error) {
    // Recording the end must not keep the admin inside someone else's session; the start has the expiry.
    console.error("Impersonation ended without its audit record", { error });
  }
  await auth.api.stopImpersonating({ headers });
  return { userId: current.user.id };
});
