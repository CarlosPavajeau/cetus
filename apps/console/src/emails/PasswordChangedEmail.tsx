import { createElement } from "react";

import type { EmailMessage } from "~/lib/email/sender";

import { EmailHeading, EmailLayout, EmailParagraph } from "./EmailLayout";

export type PasswordChangedEmailProps = {
  name: string;
  /** When the password changed, already formatted for the reader. */
  changed: string;
};

const changedFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function PasswordChangedEmail(props: PasswordChangedEmailProps) {
  return (
    <EmailLayout
      preview="La contraseña de tu cuenta de Cetus cambió"
      reason="Recibiste este correo porque la contraseña de tu cuenta de Cetus cambió. Te avisamos siempre que pasa."
    >
      <EmailHeading>Tu contraseña cambió</EmailHeading>
      <EmailParagraph>
        Hola, {props.name}. La contraseña de tu cuenta de Cetus cambió el {props.changed} (hora de
        Colombia) desde el enlace de recuperación, y cerramos las sesiones que tenías abiertas.
      </EmailParagraph>
      <EmailParagraph>
        <strong>Si no fuiste tú</strong>, escríbenos a soporte de inmediato: alguien pudo entrar a
        tu correo.
      </EmailParagraph>
    </EmailLayout>
  );
}

export function passwordChangedText(props: PasswordChangedEmailProps) {
  return [
    "Tu contraseña cambió",
    "",
    `Hola, ${props.name}. La contraseña de tu cuenta de Cetus cambió el ${props.changed} (hora de Colombia) desde el enlace de recuperación, y cerramos las sesiones que tenías abiertas.`,
    "",
    "Si no fuiste tú, escríbenos a soporte de inmediato: alguien pudo entrar a tu correo.",
  ].join("\n");
}

export function passwordChangedMessage(input: {
  to: string;
  name: string;
  changedAt: Date;
}): EmailMessage {
  const props = { name: input.name, changed: changedFormat.format(input.changedAt) };
  return {
    to: input.to,
    subject: "Tu contraseña de Cetus cambió",
    react: createElement(PasswordChangedEmail, props),
    text: passwordChangedText(props),
  };
}
