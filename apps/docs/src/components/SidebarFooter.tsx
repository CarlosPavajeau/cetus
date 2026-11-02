import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";

import { LegalLinks } from "~/components/LegalLinks";
import { StatusBadge } from "~/components/StatusBadge";

export function SidebarFooter() {
  return (
    <div className="flex flex-col gap-2">
      <StatusBadge />
      <div className="flex items-center justify-between gap-2">
        <LegalLinks />
        <ThemeSwitch />
      </div>
    </div>
  );
}
