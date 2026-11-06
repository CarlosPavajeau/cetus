import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, organizationAc, organizationRoles, roles } from "./permissions";
import type { replaceTotp } from "./replace-totp";

/** Types `authClient.twoFactor.replaceTotp` from the server plugin; the client adds nothing at runtime. */
function replaceTotpClient(): {
  id: "replace-totp";
  $InferServerPlugin?: ReturnType<typeof replaceTotp>;
} {
  return { id: "replace-totp" };
}

export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac: organizationAc, roles: organizationRoles }),
    adminClient({ ac, roles }),
    // The sign-in form routes to /two-factor itself when the response asks for a second factor.
    twoFactorClient(),
    replaceTotpClient(),
  ],
});
