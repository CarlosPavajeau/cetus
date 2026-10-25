import "@tanstack/react-start/server-only";
import { eq } from "drizzle-orm";

import { consent } from "~/lib/auth/schema";
import { db } from "~/lib/db";

import {
  type LegalDocument,
  legalDocumentNames,
  legalDocuments,
  pendingConsents,
} from "./documents";

/** Records that the user accepts the current version of every document; accepting one again changes nothing. */
export async function recordConsents(
  userId: string,
  origin: { ipAddress: string | null; userAgent: string | null },
) {
  await db
    .insert(consent)
    .values(
      legalDocumentNames.map((document) => ({
        id: crypto.randomUUID(),
        userId,
        document,
        version: legalDocuments[document].version,
        ipAddress: origin.ipAddress,
        userAgent: origin.userAgent,
      })),
    )
    .onConflictDoNothing();
}

export async function userPendingConsents(userId: string): Promise<LegalDocument[]> {
  const accepted = await db
    .select({ document: consent.document, version: consent.version })
    .from(consent)
    .where(eq(consent.userId, userId));
  return pendingConsents(accepted);
}

/** Same source as the audit log (lib/api/client.ts): Cloudflare sets CF-Connecting-IP on every request it proxies. */
export function consentOrigin(headers: Headers, fallbackIp?: string) {
  return {
    ipAddress: headers.get("cf-connecting-ip") ?? fallbackIp ?? null,
    userAgent: headers.get("user-agent"),
  };
}
