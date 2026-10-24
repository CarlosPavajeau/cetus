import { Button, Heading, Link, Text } from "react-email";

import { EmailLayout, colors } from "./EmailLayout";

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

const paragraph = {
  color: colors.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function InvitationEmail(props: InvitationEmailProps) {
  return (
    <EmailLayout
      preview={`${props.inviterName} te invitó a ${props.organization} en Cetus`}
      reason={`Recibiste este correo porque ${props.inviterEmail} te invitó a su organización en Cetus. Si no lo esperabas, ignóralo: nadie entra sin el enlace.`}
    >
      <Heading
        as="h1"
        style={{ color: colors.foreground, fontSize: 22, lineHeight: "30px", margin: "0 0 16px" }}
      >
        Te invitaron a {props.organization}
      </Heading>
      <Text style={paragraph}>
        {props.inviterName} ({props.inviterEmail}) te invitó a unirte a {props.organization} en
        Cetus, la plataforma de facturación electrónica, como <strong>{props.role}</strong>:{" "}
        {props.roleDescription.charAt(0).toLowerCase() + props.roleDescription.slice(1)}
      </Text>
      <Button
        href={props.url}
        style={{
          backgroundColor: colors.primary,
          color: colors.primaryForeground,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          padding: "12px 20px",
        }}
      >
        Unirme a {props.organization}
      </Button>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "24px 0 0" }}>
        Si el botón no funciona, copia este enlace en tu navegador:{" "}
        <Link href={props.url} style={{ color: colors.foreground, wordBreak: "break-all" }}>
          {props.url}
        </Link>
      </Text>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "8px 0 0" }}>
        La invitación vence el {props.expires}; entra o crea tu cuenta con este mismo correo.
      </Text>
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
