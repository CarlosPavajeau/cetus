import { type BadgeStatus, StatusBadge } from "~/components/ui/badge";
import type { OrderStatus } from "~/lib/api/types";

import { orderStatusLabel } from "./labels";

const badgeStatus: Record<OrderStatus, BadgeStatus> = {
  PENDING: "pending",
  PAID: "success",
  FAILED: "error",
  EXPIRED: "idle",
  REFUNDED: "warning",
  CANCELED: "idle",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge status={badgeStatus[status]}>{orderStatusLabel[status]}</StatusBadge>;
}
