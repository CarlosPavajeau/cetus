import { createElement } from "react";
import { Button, Heading, Link, Text } from "react-email";

import type { EmailMessage } from "~/lib/email/sender";

import { EmailLayout, colors } from "./EmailLayout";

export type VerificationEmailProps = {
  name: string;
  url: string;
};

const paragraph = {
  color: colors.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function VerificationEmail(props: VerificationEmailProps) {
  return (
    <EmailLayout
      preview="Confirma tu correo en Cetus"
      reason="Recibiste este correo porque alguien creó una cuenta de Cetus con esta dirección o pidió confirmarla. Si no fuiste tú, ignóralo: sin el enlace no se confirma."
    >
      <Heading
        as="h1"
        style={{ color: colors.foreground, fontSize: 22, lineHeight: "30px", margin: "0 0 16px" }}
      >
        Confirma tu correo
      </Heading>
      <Text style={paragraph}>
        Hola, {props.name}. Confirma que esta dirección es tuya. Así puedes aceptar invitaciones a
        organizaciones en Cetus, y nadie más puede unirse con tu correo.
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
        Confirmar mi correo
      </Button>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "24px 0 0" }}>
        Si el botón no funciona, copia este enlace en tu navegador:{" "}
        <Link href={props.url} style={{ color: colors.foreground, wordBreak: "break-all" }}>
          {props.url}
        </Link>
      </Text>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "8px 0 0" }}>
        El enlace vence en 24 horas.
      </Text>
    </EmailLayout>
  );
}

export function verificationText(props: VerificationEmailProps) {
  return [
    "Confirma tu correo",
    "",
    `Hola, ${props.name}. Confirma que esta dirección es tuya. Así puedes aceptar invitaciones a organizaciones en Cetus, y nadie más puede unirse con tu correo.`,
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
