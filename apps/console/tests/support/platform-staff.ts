import { createHmac } from "node:crypto";

import { config } from "dotenv";
import { Pool } from "pg";

import { type TestOrganization, createOrganization } from "./organization";

config({ quiet: true });

/**
 * A member of the Cetus team. Platform roles are only given by hand (CLI or SQL), never through the
 * API, so this writes `auth.user.role` straight to the database the local stack uses.
 */
export async function createPlatformStaff(
  role: "admin" | "support",
  { twoFactor = true } = {},
): Promise<TestOrganization & { totp: () => string }> {
  const staff = await createOrganization("Equipo Cetus");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`UPDATE auth."user" SET role = $1 WHERE email = $2`, [role, staff.email]);
  } finally {
    await pool.end();
  }

  let secret = "";
  if (twoFactor) {
    const { totpURI } = await staff.auth<{ totpURI: string }>("/two-factor/enable", {
      password: staff.password,
    });
    secret = new URL(totpURI).searchParams.get("secret") ?? "";
    await staff.auth("/two-factor/verify-totp", { code: totp(secret) });
  }
  return { ...staff, totp: () => totp(secret) };
}

/** The current RFC 6238 code (SHA-1, 6 digits, 30 s) of a base32 secret, as an authenticator shows it. */
export function totp(base32Secret: string, now = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const digest = createHmac("sha1", base32Decode(base32Secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(code).padStart(6, "0");
}

function base32Decode(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of value.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  }
  const bytes = bits.match(/.{8}/g) ?? [];
  return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2)));
}

/** The claims of a JWT, without checking its signature (the API does that). */
export function jwtClaims(token: string): Record<string, unknown> {
  const [, payload = ""] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}
