import "@tanstack/react-start/server-only";
import { env } from "../env";
import { LogEmailSender } from "./log";
import { ResendEmailSender } from "./resend";
import type { EmailSender } from "./sender";

export { EmailRejected, EmailUnavailable, type EmailMessage, type EmailSender } from "./sender";

function sender(): EmailSender {
  if (env.RESEND_API_KEY && env.CETUS_AUTH_EMAIL_FROM) {
    return new ResendEmailSender(env.RESEND_API_KEY, env.CETUS_AUTH_EMAIL_FROM);
  }
  // Like the worker, a missing half leaves the console up: invitations still show their link to share.
  if (env.RESEND_API_KEY || env.CETUS_AUTH_EMAIL_FROM) {
    console.warn("Account emails go to the log: set both RESEND_API_KEY and CETUS_AUTH_EMAIL_FROM");
  }
  return new LogEmailSender();
}

export const emailSender = sender();
