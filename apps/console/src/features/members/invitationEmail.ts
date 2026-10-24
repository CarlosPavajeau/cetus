import { createElement } from "react";

import { InvitationEmail, invitationText } from "~/emails/InvitationEmail";
import { memberRoleLabel } from "~/features/admin/labels";
import type { EmailMessage, EmailSender } from "~/lib/email/sender";

import { assignableRoleItems } from "./labels";

const expiresFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export type InvitationEmailInput = {
  to: string;
  organization: string;
  inviterName: string;
  inviterEmail: string;
  role: string;
  url: string;
  expiresAt: Date;
};

export function invitationMessage(input: InvitationEmailInput): EmailMessage {
  const props = {
    organization: input.organization,
    inviterName: input.inviterName,
    inviterEmail: input.inviterEmail,
    role: memberRoleLabel[input.role] ?? input.role,
    roleDescription:
      assignableRoleItems.find((item) => item.value === input.role)?.description ?? "",
    url: input.url,
    expires: expiresFormat.format(input.expiresAt),
  };
  return {
    to: input.to,
    subject: `${props.inviterName} te invitó a ${props.organization} en Cetus`,
    react: createElement(InvitationEmail, props),
    text: invitationText(props),
  };
}

/**
 * Prepares and sends an invitation's email, and says whether it went out. The invitation is already saved,
 * so no failure, preparing it or sending it, may cost the person who invites its link.
 */
export async function deliverInvitation(
  sender: EmailSender,
  prepare: () => Promise<EmailMessage>,
): Promise<boolean> {
  try {
    await sender.send(await prepare());
    return true;
  } catch (error) {
    console.error("Invitation saved but not emailed", error);
    return false;
  }
}
