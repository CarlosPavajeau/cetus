import type { EmailMessage, EmailSender } from "./sender";

/** Without Resend (local development), the message is written to the log, its links included. */
export class LogEmailSender implements EmailSender {
  async send(message: EmailMessage) {
    console.info(`Email to ${message.to}: ${message.subject}\n${message.text}`);
  }
}
