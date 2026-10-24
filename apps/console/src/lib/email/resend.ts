import { Resend } from "resend";

import { EmailRejected, type EmailMessage, type EmailSender, EmailUnavailable } from "./sender";

export class ResendEmailSender implements EmailSender {
  readonly #client: Resend;
  readonly #from: string;

  constructor(apiKey: string, from: string) {
    this.#client = new Resend(apiKey);
    this.#from = from;
  }

  async send(message: EmailMessage) {
    let response: Awaited<ReturnType<Resend["emails"]["send"]>>;
    try {
      response = await this.#client.emails.send({ from: this.#from, ...message });
    } catch (error) {
      throw new EmailUnavailable("Resend could not be reached", { cause: error });
    }
    const { error } = response;
    if (!error) {
      return;
    }
    const status = error.statusCode ?? 500;
    if (status >= 400 && status < 500 && status !== 429) {
      throw new EmailRejected(`Resend refused the email: ${error.name}: ${error.message}`);
    }
    throw new EmailUnavailable(`Resend failed: ${error.name}: ${error.message}`);
  }
}
