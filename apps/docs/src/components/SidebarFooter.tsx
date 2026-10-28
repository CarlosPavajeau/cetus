import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";

import { LegalLinks } from "~/components/LegalLinks";

export function SidebarFooter() {
  return (
    <div className="flex items-center justify-between gap-2">
      <LegalLinks />
      <ThemeSwitch />
    </div>
  );
}
