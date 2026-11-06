import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { backupCodeCount } from "./backup-code-count";
import { ac, organizationAc, organizationRoles, roles } from "./permissions";
import type { replaceTotp } from "./replace-totp";

/** Types `authClient.twoFactor.replaceTotp` from the server plugin; the client adds nothing at runtime. */
function replaceTotpClient(): {
  id: "replace-totp";
  $InferServerPlugin?: ReturnType<typeof replaceTotp>;
} {
  return { id: "replace-totp" };
}

/** Types `authClient.twoFactor.backupCodes.count` from the server plugin. */
function backupCodeCountClient(): {
  id: "backup-code-count";
  $InferServerPlugin?: ReturnType<typeof backupCodeCount>;
} {
  return { id: "backup-code-count" };
}

export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac: organizationAc, roles: organizationRoles }),
    adminClient({ ac, roles }),
    // The sign-in form routes to /two-factor itself when the response asks for a second factor.
    twoFactorClient(),
    replaceTotpClient(),
    backupCodeCountClient(),
  ],
});
