import { mkdir, rename, writeFile } from "node:fs/promises";
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
    // Readers only take *.json, and a rename is atomic: none ever sees a message half written.
    const name = join(this.#dir, `${Date.now()}-${crypto.randomUUID()}`);
    await writeFile(`${name}.tmp`, JSON.stringify(email));
    await rename(`${name}.tmp`, `${name}.json`);
    console.info(`Email to ${message.to}: ${message.subject} (outbox)`);
  }
}
