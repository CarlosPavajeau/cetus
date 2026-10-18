import { redirect } from "@tanstack/react-router";

import { getSession } from "./server";

/** `beforeLoad` of the protected routes: sends visitors without a session to sign in. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw redirect({ to: "/sign-in" });
  }
  return { session };
}
