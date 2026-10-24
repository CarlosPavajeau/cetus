import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { type } from "arktype";
import { APIError } from "better-auth/api";

import { assignableMemberRoles, invitationSeconds } from "~/lib/auth/permissions";
import { auth } from "~/lib/auth/server";
import { emailSender } from "~/lib/email";
import { env } from "~/lib/env";

import { deliverInvitation, invitationMessage } from "./invitationEmail";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  self: boolean;
};

/** An invitation waiting for an answer, with the link to share; it only opens for the invited address. */
export type Invitation = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  url: string;
};

/** Built on the server from the console's public URL: the page also renders there, without `window`. */
function invitationUrl(id: string) {
  return new URL(`/invitations/${id}`, env.BETTER_AUTH_URL).toString();
}

export type Members = { members: Member[]; invitations: Invitation[] };

/** The active organization's members and its invitations still waiting for an answer. */
export const listMembers = createServerFn({ method: "GET" }).handler(async (): Promise<Members> => {
  const headers = getRequestHeaders();
  const [organization, session] = await Promise.all([
    auth.api.getFullOrganization({ headers }),
    auth.api.getSession({ headers }),
  ]);
  if (!organization || !session) {
    return { members: [], invitations: [] };
  }
  const now = Date.now();
  return {
    members: organization.members.map((member) => ({
      id: member.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      self: member.userId === session.user.id,
    })),
    invitations: organization.invitations
      .filter(
        (invitation) =>
          invitation.status === "pending" && new Date(invitation.expiresAt).getTime() > now,
      )
      .map((invitation) => ({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: new Date(invitation.expiresAt).toISOString(),
        url: invitationUrl(invitation.id),
      })),
  };
});

export type MemberResult = { ok: true } | { ok: false; message: string };

const messages: Record<string, string> = {
  USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "Esa persona ya es miembro de la organización.",
  USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION:
    "Esa persona ya tiene una invitación pendiente. Cancélala para enviarle otra.",
  INVALID_EMAIL: "Escribe un correo válido.",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
    "Solo los dueños y administradores de la organización invitan personas.",
  YOU_ARE_NOT_ALLOWED_TO_INVITE_USER_WITH_THIS_ROLE: "No puedes invitar a alguien con ese rol.",
  YOU_ARE_NOT_ALLOWED_TO_CANCEL_THIS_INVITATION:
    "Solo los dueños y administradores de la organización cancelan invitaciones.",
  YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: "No puedes cambiar el rol de esta persona.",
  YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: "No puedes quitar a esta persona de la organización.",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
    "La organización necesita un dueño: no se puede quitar al único.",
  YOU_CANNOT_LEAVE_THE_ORGANIZATION_WITHOUT_AN_OWNER:
    "La organización necesita un dueño: no se puede quitar al único.",
  INVITATION_NOT_FOUND: "La invitación ya no existe o ya fue respondida.",
  MEMBER_NOT_FOUND: "Esa persona ya no es miembro de la organización.",
  IMPERSONATION_FORBIDDEN: "Los miembros solo los gestiona la persona de la cuenta.",
};

/** A refusal of Better Auth, explained; anything else is thrown. */
function refusal(error: unknown, fallback: string): { ok: false; message: string } {
  if (error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500) {
    const code = error.body?.code;
    return { ok: false, message: (code && messages[code]) || fallback };
  }
  throw error;
}

async function change(call: () => Promise<unknown>, fallback: string): Promise<MemberResult> {
  try {
    await call();
    return { ok: true };
  } catch (error) {
    return refusal(error, fallback);
  }
}

const memberRole = type.enumerated(...assignableMemberRoles);

export type InviteResult =
  | { ok: true; url: string; emailed: boolean }
  | { ok: false; message: string };

/** Emails the invitation to its address; whatever fails, the invitation and its link stand. */
function emailInvitation(
  headers: Headers,
  invitation: { id: string; email: string; role: string; expiresAt: Date },
): Promise<boolean> {
  return deliverInvitation(emailSender, async () => {
    const [organization, session] = await Promise.all([
      auth.api.getFullOrganization({ headers }),
      auth.api.getSession({ headers }),
    ]);
    if (!organization || !session) {
      throw new Error(
        `Invitation ${invitation.id} has no active organization or session to email it`,
      );
    }
    return invitationMessage({
      to: invitation.email,
      organization: organization.name,
      inviterName: session.user.name,
      inviterEmail: session.user.email,
      role: invitation.role,
      url: invitationUrl(invitation.id),
      expiresAt: invitation.expiresAt,
    });
  });
}

/**
 * Invites someone to the active organization and emails them the link. The link only works for this
 * address; the console also shows it, to share if the email does not arrive.
 */
export const inviteMember = createServerFn({ method: "POST" })
  .validator(type({ email: "string.email", role: memberRole }))
  .handler(async ({ data }): Promise<InviteResult> => {
    const headers = getRequestHeaders();
    let invitation: Awaited<ReturnType<typeof auth.api.createInvitation>>;
    try {
      invitation = await auth.api.createInvitation({
        headers,
        body: { email: data.email, role: data.role },
      });
    } catch (error) {
      return refusal(error, "No pudimos crear la invitación.");
    }
    const emailed = await emailInvitation(headers, invitation);
    return { ok: true, url: invitationUrl(invitation.id), emailed };
  });

export type ResendResult = { ok: true; emailed: boolean } | { ok: false; message: string };

/** One email a minute per invitation, so a double click or an impatient person sends one. */
const resendIntervalSeconds = 60;

/** Emails a pending invitation again; Better Auth restarts its validity rather than creating another. */
export const resendInvitation = createServerFn({ method: "POST" })
  .validator(type({ invitationId: "string > 0" }))
  .handler(async ({ data }): Promise<ResendResult> => {
    const headers = getRequestHeaders();
    const organization = await auth.api.getFullOrganization({ headers });
    const pending = organization?.invitations.find(
      (invitation) => invitation.id === data.invitationId && invitation.status === "pending",
    );
    if (!pending) {
      return { ok: false, message: "La invitación ya no existe o ya fue respondida." };
    }
    const role = assignableMemberRoles.find((value) => value === pending.role);
    if (!role) {
      throw new Error(
        `Invitation ${pending.id} has a role the console does not hand out: ${pending.role}`,
      );
    }
    const sentAt = new Date(pending.expiresAt).getTime() - invitationSeconds * 1000;
    if (Date.now() - sentAt < resendIntervalSeconds * 1000) {
      return { ok: false, message: "Acabamos de enviarla. Espera un minuto antes de reenviarla." };
    }
    let invitation: Awaited<ReturnType<typeof auth.api.createInvitation>>;
    try {
      invitation = await auth.api.createInvitation({
        headers,
        body: { email: pending.email, role, resend: true },
      });
    } catch (error) {
      return refusal(error, "No pudimos reenviar la invitación.");
    }
    return { ok: true, emailed: await emailInvitation(headers, invitation) };
  });

export const cancelInvitation = createServerFn({ method: "POST" })
  .validator(type({ invitationId: "string > 0" }))
  .handler(({ data }) =>
    change(
      () =>
        auth.api.cancelInvitation({
          headers: getRequestHeaders(),
          body: { invitationId: data.invitationId },
        }),
      "No pudimos cancelar la invitación.",
    ),
  );

export const updateMemberRole = createServerFn({ method: "POST" })
  .validator(type({ memberId: "string > 0", role: memberRole }))
  .handler(({ data }) =>
    change(
      () =>
        auth.api.updateMemberRole({
          headers: getRequestHeaders(),
          body: { memberId: data.memberId, role: data.role },
        }),
      "No pudimos cambiar el rol.",
    ),
  );

export const removeMember = createServerFn({ method: "POST" })
  .validator(type({ memberId: "string > 0" }))
  .handler(({ data }) =>
    change(
      () =>
        auth.api.removeMember({
          headers: getRequestHeaders(),
          body: { memberIdOrEmail: data.memberId },
        }),
      "No pudimos quitar a esta persona.",
    ),
  );

export type InvitationDetails =
  | { status: "signed-out" }
  | { status: "invalid"; message: string }
  | {
      status: "pending";
      organizationName: string;
      inviterEmail: string;
      email: string;
      role: string;
    };

/** The invitation as its recipient sees it; only the invited address, signed in, can read it. */
export const getInvitationDetails = createServerFn({ method: "GET" })
  .validator(type({ id: "string > 0" }))
  .handler(async ({ data }): Promise<InvitationDetails> => {
    const headers = getRequestHeaders();
    if (!(await auth.api.getSession({ headers }))) {
      return { status: "signed-out" };
    }
    try {
      const invitation = await auth.api.getInvitation({ headers, query: { id: data.id } });
      return {
        status: "pending",
        organizationName: invitation.organizationName,
        inviterEmail: invitation.inviterEmail,
        email: invitation.email,
        role: invitation.role,
      };
    } catch (error) {
      if (
        error instanceof APIError &&
        error.body?.code === "YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION"
      ) {
        return {
          status: "invalid",
          message:
            "Esta invitación es para otro correo. Cierra sesión y entra, o crea tu cuenta, con el correo invitado.",
        };
      }
      return {
        status: "invalid",
        message: refusal(
          error,
          "Venció, ya se usó o la cancelaron. Pide a quien te invitó un enlace nuevo.",
        ).message,
      };
    }
  });
