import { createElement } from "react";

import type { EmailMessage } from "~/lib/email/sender";

import { EmailHeading, EmailLayout, EmailParagraph } from "./EmailLayout";

export type TwoFactorChangedEmailProps = {
  name: string;
  /** When the app changed, already formatted for the reader. */
  changed: string;
};

const changedFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function TwoFactorChangedEmail(props: TwoFactorChangedEmailProps) {
  return (
    <EmailLayout
      preview="Conectaste una nueva aplicación de autenticación a tu cuenta de Cetus"
      reason="Recibiste este correo porque la aplicación de autenticación de tu cuenta de Cetus cambió. Te avisamos siempre que pasa."
    >
      <EmailHeading>Tu aplicación de autenticación cambió</EmailHeading>
      <EmailParagraph>
        Hola, {props.name}. El {props.changed} (hora de Colombia) conectaste una nueva aplicación de
        autenticación a tu cuenta de Cetus. Los códigos de la anterior ya no sirven; tus códigos de
        respaldo siguen funcionando.
      </EmailParagraph>
      <EmailParagraph>
        <strong>Si no fuiste tú</strong>, escríbenos a soporte de inmediato: alguien pudo entrar a
        tu cuenta.
      </EmailParagraph>
    </EmailLayout>
  );
}

export function twoFactorChangedText(props: TwoFactorChangedEmailProps) {
  return [
    "Tu aplicación de autenticación cambió",
    "",
    `Hola, ${props.name}. El ${props.changed} (hora de Colombia) conectaste una nueva aplicación de autenticación a tu cuenta de Cetus. Los códigos de la anterior ya no sirven; tus códigos de respaldo siguen funcionando.`,
    "",
    "Si no fuiste tú, escríbenos a soporte de inmediato: alguien pudo entrar a tu cuenta.",
  ].join("\n");
}

export function twoFactorChangedMessage(input: {
  to: string;
  name: string;
  changedAt: Date;
}): EmailMessage {
  const props = { name: input.name, changed: changedFormat.format(input.changedAt) };
  return {
    to: input.to,
    subject: "Cambiaste la aplicación de autenticación de Cetus",
    react: createElement(TwoFactorChangedEmail, props),
    text: twoFactorChangedText(props),
  };
}
