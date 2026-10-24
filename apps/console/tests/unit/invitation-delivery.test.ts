import { describe, expect, it } from "vite-plus/test";

import { deliverInvitation, invitationMessage } from "~/features/members/invitationEmail";
import { EmailUnavailable, type EmailMessage, type EmailSender } from "~/lib/email/sender";

const input = {
  to: "facturador@cetus.test",
  organization: "Panadería La Espiga SAS",
  inviterName: "Laura Gómez",
  inviterEmail: "laura@cetus.test",
  role: "biller",
  url: `https://cetus.test/invitations/${crypto.randomUUID()}`,
  expiresAt: new Date(),
};

class CapturingSender implements EmailSender {
  readonly sent: EmailMessage[] = [];

  async send(message: EmailMessage) {
    this.sent.push(message);
  }
}

const failingSender: EmailSender = {
  send: () => Promise.reject(new EmailUnavailable("Resend is down")),
};

describe("invitationMessage", () => {
  it("goes to the invited address, names who invites and links to the invitation", () => {
    const message = invitationMessage(input);
    expect(message.to).toBe(input.to);
    expect(message.subject).toBe("Laura Gómez te invitó a Panadería La Espiga SAS en Cetus");
    expect(message.text).toContain(input.url);
    expect(message.text).toContain("como Facturador");
  });
});

describe("deliverInvitation", () => {
  it("sends the prepared message", async () => {
    const sender = new CapturingSender();
    expect(await deliverInvitation(sender, async () => invitationMessage(input))).toBe(true);
    expect(sender.sent.map((message) => message.to)).toEqual([input.to]);
  });

  it("says the email did not go out when the sender fails", async () => {
    expect(await deliverInvitation(failingSender, async () => invitationMessage(input))).toBe(
      false,
    );
  });

  it("says the email did not go out when preparing it fails, and sends nothing", async () => {
    const sender = new CapturingSender();
    const delivered = await deliverInvitation(sender, () =>
      Promise.reject(new Error("The organization could not be read")),
    );
    expect(delivered).toBe(false);
    expect(sender.sent).toEqual([]);
  });
});
