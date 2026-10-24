import { EmailAction, EmailHeading, EmailLayout, EmailNote, EmailParagraph } from "./EmailLayout";

export type InvitationEmailProps = {
  organization: string;
  inviterName: string;
  inviterEmail: string;
  /** The role in words, e.g. "Facturador". */
  role: string;
  /** What the role lets the person do. */
  roleDescription: string;
  url: string;
  /** When the invitation expires, already formatted for the reader. */
  expires: string;
};

export function InvitationEmail(props: InvitationEmailProps) {
  return (
    <EmailLayout
      preview={`${props.inviterName} te invitó a ${props.organization} en Cetus`}
      reason={`Recibiste este correo porque ${props.inviterEmail} te invitó a su organización en Cetus. Si no lo esperabas, ignóralo: nadie entra sin el enlace.`}
    >
      <EmailHeading>Te invitaron a {props.organization}</EmailHeading>
      <EmailParagraph>
        {props.inviterName} ({props.inviterEmail}) te invitó a unirte a {props.organization} en
        Cetus, la plataforma de facturación electrónica, como <strong>{props.role}</strong>:{" "}
        {props.roleDescription.charAt(0).toLowerCase() + props.roleDescription.slice(1)}
      </EmailParagraph>
      <EmailAction href={props.url}>Unirme a {props.organization}</EmailAction>
      <EmailNote>
        La invitación vence el {props.expires}; entra o crea tu cuenta con este mismo correo.
      </EmailNote>
    </EmailLayout>
  );
}

export const invitationEmailSample = {
  organization: "Panadería La Espiga SAS",
  inviterName: "Laura Gómez",
  inviterEmail: "laura@laespiga.co",
  role: "Facturador",
  roleDescription: "Emite en producción y usa el catálogo; consulta lo demás.",
  url: "https://cetus.cantte.com/invitations/abc123",
  expires: "26 de octubre de 2026, 3:00 p. m.",
} satisfies InvitationEmailProps;

export function invitationText(props: InvitationEmailProps) {
  return [
    `Te invitaron a ${props.organization}`,
    "",
    `${props.inviterName} (${props.inviterEmail}) te invitó a unirte a ${props.organization} en Cetus como ${props.role}: ${props.roleDescription}`,
    "",
    `Únete aquí: ${props.url}`,
    "",
    `La invitación vence el ${props.expires}; entra o crea tu cuenta con este mismo correo.`,
    "",
    "Si no esperabas esta invitación, ignora este correo.",
  ].join("\n");
}
