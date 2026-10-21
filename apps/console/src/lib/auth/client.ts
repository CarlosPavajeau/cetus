import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, roles } from "./permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
    adminClient({ ac, roles }),
    // The sign-in form routes to /two-factor itself when the response asks for a second factor.
    twoFactorClient(),
  ],
});
