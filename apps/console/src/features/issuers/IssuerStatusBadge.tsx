import { type BadgeStatus, StatusBadge } from "~/components/ui/badge";
import type { Issuer } from "~/lib/api/types";

import { statusLabel } from "./labels";

const badgeStatus: Record<Issuer["status"], BadgeStatus> = {
  ONBOARDING: "warning",
  TESTING: "info",
  ENABLED: "success",
  DISABLED: "idle",
};

export function IssuerStatusBadge({ status }: { status: Issuer["status"] }) {
  return <StatusBadge status={badgeStatus[status]}>{statusLabel[status]}</StatusBadge>;
}
