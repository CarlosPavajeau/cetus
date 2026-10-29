import { useMutation } from "@tanstack/react-query";
import { EyeIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { timeFormat } from "~/features/audit-log/labels";
import { useImpersonation } from "~/features/session/useImpersonation";

import { stopImpersonation } from "./impersonation";

/**
 * Always visible while a Cetus admin acts as this user (it stays on top while the page scrolls), with the
 * way back to the administration.
 */
export function ImpersonationBanner() {
  const impersonation = useImpersonation();
  const stop = useMutation({
    mutationFn: stopImpersonation,
    // A full load: the restored session must reach every guard and cache.
    onSuccess: ({ userId }) => window.location.assign(`/admin/users/${userId}`),
    onError: () => window.location.assign("/sign-in"),
  });
  if (!impersonation) {
    return null;
  }
  return (
    <aside
      aria-label="Sesión de soporte"
      className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-impersonation px-4 py-2 text-xs text-impersonation-foreground"
    >
      <span className="flex items-center gap-2">
        <EyeIcon className="size-3.5" aria-hidden />
        Estás viendo la consola como <strong>{impersonation.user.email}</strong> · termina a las{" "}
        {timeFormat.format(new Date(impersonation.expiresAt))}
      </span>
      <Button
        size="sm"
        variant="outline"
        // oxlint-disable-next-line shadcn/no-restyle -- takes the banner's own tone, the only button on it
        className="h-7 border-impersonation-foreground/30 bg-transparent hover:bg-impersonation-hover"
        onClick={() => stop.mutate({})}
        disabled={stop.isPending}
      >
        {stop.isPending && <Spinner data-icon="inline-start" />}
        Terminar
      </Button>
    </aside>
  );
}
