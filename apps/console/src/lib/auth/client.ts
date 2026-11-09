import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { backupCodeCount } from "./backup-code-count";
import type { cancelTotpEnrollment } from "./cancel-totp-enrollment";
import { ac, organizationAc, organizationRoles, roles } from "./permissions";
import type { replaceTotp } from "./replace-totp";

/** Types `authClient.twoFactor.replaceTotp` from the server plugin. */
function replaceTotpClient(): {
  id: "replace-totp";
  $InferServerPlugin?: ReturnType<typeof replaceTotp>;
  pathMethods: Record<string, "POST">;
} {
  // Without a body the client would send GET.
  return { id: "replace-totp", pathMethods: { "/two-factor/replace-totp/cancel": "POST" } };
}

/** Types `authClient.twoFactor.backupCodes.count` from the server plugin. */
function backupCodeCountClient(): {
  id: "backup-code-count";
  $InferServerPlugin?: ReturnType<typeof backupCodeCount>;
} {
  return { id: "backup-code-count" };
}

/** Types `authClient.twoFactor.cancelEnrollment` from the server plugin. */
function cancelTotpEnrollmentClient(): {
  id: "cancel-totp-enrollment";
  $InferServerPlugin?: ReturnType<typeof cancelTotpEnrollment>;
  pathMethods: Record<string, "POST">;
} {
  return { id: "cancel-totp-enrollment", pathMethods: { "/two-factor/cancel-enrollment": "POST" } };
}

export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac: organizationAc, roles: organizationRoles }),
    adminClient({ ac, roles }),
    // The sign-in form routes to /two-factor itself when the response asks for a second factor.
    twoFactorClient(),
    replaceTotpClient(),
    backupCodeCountClient(),
    cancelTotpEnrollmentClient(),
  ],
});
