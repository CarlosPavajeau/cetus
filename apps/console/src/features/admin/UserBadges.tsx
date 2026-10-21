import { Badge } from "~/components/ui/badge";
import { dayFormat } from "~/features/audit-log/labels";
import type { PlatformRole } from "~/lib/auth/permissions";

import type { AdminUser } from "./users";

const roleLabel: Record<PlatformRole, string> = { admin: "Admin Cetus", support: "Soporte Cetus" };

export function PlatformRoleBadge({ role }: { role: PlatformRole | null }) {
  return role ? <Badge variant="outline">{roleLabel[role]}</Badge> : null;
}

/** Active, or banned and until when. */
export function BanBadge({ user }: { user: Pick<AdminUser, "banActive" | "banExpires"> }) {
  if (!user.banActive) {
    return <Badge variant="secondary">Activo</Badge>;
  }
  return (
    <Badge variant="destructive">
      {user.banExpires
        ? `Bloqueado hasta el ${dayFormat.format(new Date(user.banExpires))}`
        : "Bloqueado"}
    </Badge>
  );
}
