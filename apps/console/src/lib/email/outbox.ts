import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { EmailMessage, EmailSender } from "./sender";

/** What the outbox keeps of a message: enough for a test to read its links. */
export type OutboxEmail = { to: string; subject: string; text: string; sentAt: string };

/**
 * Development and CI only: each message becomes a JSON file in a directory, where the end-to-end tests read
 * the links an email carries (a verification, an invitation). Never used with a Resend key.
 */
export class OutboxEmailSender implements EmailSender {
  readonly #dir: string;

  constructor(dir: string) {
    this.#dir = dir;
  }

  async send(message: EmailMessage) {
    const email: OutboxEmail = {
      to: message.to,
      subject: message.subject,
      text: message.text,
      sentAt: new Date().toISOString(),
    };
    await mkdir(this.#dir, { recursive: true });
    await writeFile(
      join(this.#dir, `${Date.now()}-${crypto.randomUUID()}.json`),
      JSON.stringify(email),
    );
    console.info(`Email to ${message.to}: ${message.subject} (outbox)`);
  }
}
