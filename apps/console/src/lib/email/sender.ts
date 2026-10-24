import type { ReactElement } from "react";

export type EmailMessage = {
  to: string;
  subject: string;
  react: ReactElement;
  /** The plain-text version, written for reading rather than derived from the HTML. */
  text: string;
};

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

/** The provider refused the message (bad address, unverified sender): sending it again changes nothing. */
export class EmailRejected extends Error {}

/** The provider could not be reached or failed: the same message may go through later. */
export class EmailUnavailable extends Error {}
