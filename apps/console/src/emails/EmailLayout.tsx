import type { ReactNode } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "react-email";

/** The console's colors (zinc), in hex: email clients do not read oklch or CSS variables. */
export const colors = {
  foreground: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  background: "#f4f4f5",
  primary: "#18181b",
  primaryForeground: "#fafafa",
};

const font =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** The frame of every account email: the name of Cetus, the content and why it arrived. */
export function EmailLayout({
  preview,
  reason,
  children,
}: {
  /** The line inboxes show next to the subject. */
  preview: string;
  /** Why the person received it, for the footer. */
  reason: string;
  children: ReactNode;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.background,
          fontFamily: font,
          margin: 0,
          padding: "32px 0",
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            backgroundColor: "#ffffff",
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: "32px 40px",
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              margin: "0 0 24px",
            }}
          >
            Cetus
          </Text>
          <Section>{children}</Section>
          <Hr style={{ borderColor: colors.border, margin: "32px 0 16px" }} />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: "18px", margin: 0 }}>
            {reason}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailHeading({ children }: { children: ReactNode }) {
  return (
    <Heading
      as="h1"
      style={{ color: colors.foreground, fontSize: 22, lineHeight: "30px", margin: "0 0 16px" }}
    >
      {children}
    </Heading>
  );
}

const paragraph = {
  color: colors.foreground,
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
};

export function EmailParagraph({ children }: { children: ReactNode }) {
  return <Text style={paragraph}>{children}</Text>;
}

/** Small print under the button, such as when the link expires. */
export function EmailNote({ children }: { children: ReactNode }) {
  return (
    <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "8px 0 0" }}>
      {children}
    </Text>
  );
}

/** The email's action, followed by its link in plain text for clients that do not show the button. */
export function EmailAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <>
      <Button
        href={href}
        style={{
          backgroundColor: colors.primary,
          color: colors.primaryForeground,
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          padding: "12px 20px",
        }}
      >
        {children}
      </Button>
      <Text style={{ ...paragraph, color: colors.muted, fontSize: 13, margin: "24px 0 0" }}>
        Si el botón no funciona, copia este enlace en tu navegador:{" "}
        <Link href={href} style={{ color: colors.foreground, wordBreak: "break-all" }}>
          {href}
        </Link>
      </Text>
    </>
  );
}
