import type { ReactNode } from "react";
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "react-email";

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
