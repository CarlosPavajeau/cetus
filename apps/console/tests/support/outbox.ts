import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { type } from "arktype";
import { config } from "dotenv";

config({ quiet: true });

const outboxEmail = type({ to: "string", subject: "string", text: "string", sentAt: "string" });

export type OutboxEmail = typeof outboxEmail.infer;

/**
 * The newest email the console sent to an address, read from its outbox (CETUS_EMAIL_OUTBOX_DIR, set in the
 * console's .env without Resend). Waits for it up to 10 seconds.
 */
export async function latestEmailTo(address: string, attemptsLeft = 20): Promise<OutboxEmail> {
  const dir = process.env.CETUS_EMAIL_OUTBOX_DIR;
  if (!dir) {
    throw new Error("Set CETUS_EMAIL_OUTBOX_DIR in apps/console/.env (see .env.example)");
  }
  // Only finished messages: the console writes each one as *.tmp and renames it when complete.
  const files = (await readdir(dir).catch(() => [])).filter((file) => file.endsWith(".json"));
  const emails = await Promise.all(
    files.map(async (file) =>
      outboxEmail.assert(JSON.parse(await readFile(join(dir, file), "utf8"))),
    ),
  );
  const latest = emails
    .filter((email) => email.to === address)
    .reduce<OutboxEmail | undefined>(
      (newest, email) => (!newest || email.sentAt > newest.sentAt ? email : newest),
      undefined,
    );
  if (latest) {
    return latest;
  }
  if (attemptsLeft <= 1) {
    throw new Error(`No email to ${address} in ${dir}`);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return latestEmailTo(address, attemptsLeft - 1);
}

/** The first link of an email's text that goes to the given path. */
export function linkTo(email: OutboxEmail, path: string): string {
  const link = email.text.match(/https?:\/\/\S+/g)?.find((url) => new URL(url).pathname === path);
  if (!link) {
    throw new Error(`The email "${email.subject}" has no link to ${path}`);
  }
  return link;
}
