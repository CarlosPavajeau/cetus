import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { InvitationEmail, invitationEmailSample, invitationText } from "~/emails/InvitationEmail";

describe("InvitationEmail", () => {
  it("names the organization and the role, and links to the invitation", () => {
    const html = renderToStaticMarkup(createElement(InvitationEmail, invitationEmailSample));
    expect(html).toContain(`Te invitaron a ${invitationEmailSample.organization}`);
    expect(html).toContain(invitationEmailSample.role);
    expect(html).toContain(`href="${invitationEmailSample.url}"`);
    expect(html).toContain(invitationEmailSample.expires);
  });

  it("has a plain-text version with the link", () => {
    const text = invitationText(invitationEmailSample);
    expect(text).toContain(`Únete aquí: ${invitationEmailSample.url}`);
    expect(text).toContain(invitationEmailSample.inviterEmail);
  });
});
