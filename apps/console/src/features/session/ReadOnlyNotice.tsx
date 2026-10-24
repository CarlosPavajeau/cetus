import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";

import { useMemberPermissions } from "./useMemberPermissions";

/** Tells members who are not owners or admins that this page is theirs to read only. */
export function ReadOnlyNotice({ children }: { children: ReactNode }) {
  const { manage } = useMemberPermissions();
  if (manage) {
    return null;
  }
  return (
    <Alert>
      <AlertTitle>Solo lectura</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
