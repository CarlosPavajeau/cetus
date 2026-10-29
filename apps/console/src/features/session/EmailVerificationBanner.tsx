import { useMutation } from "@tanstack/react-query";
import { MailWarningIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { authClient } from "~/lib/auth/client";

const resendDelayMs = 60_000;

/**
 * Visible until the person confirms their address. Signing in never waits for it; joining an organization
 * by invitation does.
 */
export function EmailVerificationBanner({ email }: { email: string }) {
  const send = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/overview" });
      if (error) {
        throw new Error(
          error.status === 429
            ? "Ya pediste varios correos. Espera un minuto antes de pedir otro."
            : "No pudimos enviar el correo. Inténtalo de nuevo en un momento.",
        );
      }
    },
  });
  const { isSuccess, reset } = send;

  useEffect(() => {
    if (!isSuccess) {
      return undefined;
    }
    const timer = setTimeout(reset, resendDelayMs);
    return () => clearTimeout(timer);
  }, [isSuccess, reset]);

  return (
    <aside
      aria-label="Correo sin confirmar"
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-warning-surface px-4 py-1.5 text-xs text-warning-surface-foreground"
    >
      <span className="flex items-center gap-2">
        <MailWarningIcon className="size-3.5" aria-hidden />
        {send.isSuccess ? (
          <span>
            Te enviamos el enlace a <strong>{email}</strong>. Ábrelo en este navegador.
          </span>
        ) : (
          <span>
            <strong>Confirma tu correo</strong> {email} con el enlace que te enviamos.
          </span>
        )}
      </span>
      {send.error && <span role="alert">{send.error.message}</span>}
      <Button
        size="sm"
        variant="outline"
        // oxlint-disable-next-line shadcn/no-restyle -- takes the banner's own tone, the only button on it
        className="h-7 border-warning-surface-foreground/30 bg-transparent"
        onClick={() => send.mutate()}
        disabled={send.isPending || send.isSuccess}
      >
        {send.isPending && <Spinner data-icon="inline-start" />}
        Reenviar
      </Button>
    </aside>
  );
}
