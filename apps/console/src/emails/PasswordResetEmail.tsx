import { createElement } from "react";
import { Button, Heading, Link, Text } from "react-email";

import type { EmailMessage } from "~/lib/email/sender";

import { EmailLayout, colors } from "./EmailLayout";

export type PasswordResetEmailProps = {
  name: string;
  url: string;
};

const paragraph = {
  color: colors.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function PasswordResetEmail(props: PasswordResetEmailProps) {
  return (
    <EmailLayout
      preview="Elige una contraseña nueva para Cetus"
      reason="Recibiste este correo porque alguien pidió cambiar la contraseña de tu cuenta de Cetus. Si no fuiste tú, ignóralo: tu contraseña no cambia."
    >
      <Heading
        as="h1"
        style={{ color: colors.foreground, fontSize: 22, lineHeight: "30px", margin: "0 0 16px" }}
      >
        Recupera tu contraseña
      </Heading>
      <Text style={paragraph}>
        Hola, {props.name}. Pediste cambiar la contraseña de tu cuenta de Cetus. Elige una nueva
        desde este enlace; al hacerlo se cierran las sesiones abiertas.
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
        Elegir una contraseña nueva
      </Button>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "24px 0 0" }}>
        Si el botón no funciona, copia este enlace en tu navegador:{" "}
        <Link href={props.url} style={{ color: colors.foreground, wordBreak: "break-all" }}>
          {props.url}
        </Link>
      </Text>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "8px 0 0" }}>
        El enlace vence en 1 hora y sirve una sola vez.
      </Text>
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
