import { createElement } from "react";

import type { EmailMessage } from "~/lib/email/sender";

import { EmailAction, EmailHeading, EmailLayout, EmailNote, EmailParagraph } from "./EmailLayout";

export type PasswordResetEmailProps = {
  name: string;
  url: string;
};

export function PasswordResetEmail(props: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Elige una contraseña nueva para Cetus"
      reason="Recibiste este correo porque alguien pidió cambiar la contraseña de tu cuenta de Cetus. Si no fuiste tú, ignóralo: tu contraseña no cambia."
    >
      <EmailHeading>Recupera tu contraseña</EmailHeading>
      <EmailParagraph>
        Hola, {props.name}. Pediste cambiar la contraseña de tu cuenta de Cetus. Elige una nueva
        desde este enlace; al hacerlo se cierran las sesiones abiertas.
      </EmailParagraph>
      <EmailAction href={props.url}>Elegir una contraseña nueva</EmailAction>
      <EmailNote>El enlace vence en 1 hora y sirve una sola vez.</EmailNote>
    </EmailLayout>
  );
}

export function passwordResetText(props: PasswordResetEmailProps) {
  return [
    "Recupera tu contraseña",
    "",
    `Hola, ${props.name}. Pediste cambiar la contraseña de tu cuenta de Cetus. Elige una nueva desde este enlace; al hacerlo se cierran las sesiones abiertas.`,
    "",
    `Elige una contraseña nueva aquí: ${props.url}`,
    "",
    "El enlace vence en 1 hora y sirve una sola vez. Si no lo pediste, ignora este correo: tu contraseña no cambia.",
  ].join("\n");
}

export function passwordResetMessage(input: {
  to: string;
  name: string;
  url: string;
}): EmailMessage {
  const props = { name: input.name, url: input.url };
  return {
    to: input.to,
    subject: "Recupera tu contraseña de Cetus",
    react: createElement(PasswordResetEmail, props),
    text: passwordResetText(props),
  };
}
