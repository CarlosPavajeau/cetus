import { useRouteContext } from "@tanstack/react-router";

import { type MemberPermissions, memberPermissions } from "~/lib/auth/permissions";

/** What the signed-in member may do in the active organization; the API enforces the same lists. */
export function useMemberPermissions(): MemberPermissions {
  const { session } = useRouteContext({ from: "/_app" });
  return memberPermissions(session.memberRoles);
}
