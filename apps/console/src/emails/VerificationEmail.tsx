import { createElement } from "react";

import type { EmailMessage } from "~/lib/email/sender";

import { EmailAction, EmailHeading, EmailLayout, EmailNote, EmailParagraph } from "./EmailLayout";

export type VerificationEmailProps = {
  name: string;
  url: string;
};

export function VerificationEmail(props: VerificationEmailProps) {
  return (
    <EmailLayout
      preview="Confirma tu correo para unirte en Cetus"
      reason="Recibiste este correo porque alguien creó una cuenta de Cetus con esta dirección o pidió confirmarla. Si no fuiste tú, ignóralo: sin el enlace no se confirma."
    >
      <EmailHeading>Confirma tu correo</EmailHeading>
      <EmailParagraph>
        Hola, {props.name}. Confirma que esta dirección es tuya para aceptar la invitación a una
        organización en Cetus. Así nadie más puede unirse con tu correo.
      </EmailParagraph>
      <EmailAction href={props.url}>Confirmar mi correo</EmailAction>
      <EmailNote>El enlace vence en 24 horas.</EmailNote>
    </EmailLayout>
  );
}

export function verificationText(props: VerificationEmailProps) {
  return [
    "Confirma tu correo",
    "",
    `Hola, ${props.name}. Confirma que esta dirección es tuya para aceptar la invitación a una organización en Cetus. Así nadie más puede unirse con tu correo.`,
    "",
    `Confírmalo aquí: ${props.url}`,
    "",
    "El enlace vence en 24 horas. Si no creaste una cuenta en Cetus, ignora este correo.",
  ].join("\n");
}

export function verificationMessage(input: {
  to: string;
  name: string;
  url: string;
}): EmailMessage {
  const props = { name: input.name, url: input.url };
  return {
    to: input.to,
    subject: "Confirma tu correo en Cetus",
    react: createElement(VerificationEmail, props),
    text: verificationText(props),
  };
}
