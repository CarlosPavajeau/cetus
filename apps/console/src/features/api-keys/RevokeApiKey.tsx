import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import type { ApiKey } from "~/lib/api/types";

import { apiKeysQuery } from "./queries";
import { revokeApiKey } from "./server";

/**
 * Refetches the keys, the open key detail included, and marks the audit log stale,
 * since it records every create and revoke.
 */
export function useInvalidateApiKeys() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: apiKeysQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: auditLogKey }),
    ]);
}

export function RevokeApiKey({
  apiKey,
  size = "sm",
  children,
}: {
  apiKey: ApiKey;
  size?: "sm" | "default";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const invalidateApiKeys = useInvalidateApiKeys();
  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: async () => {
      await invalidateApiKeys();
      setOpen(false);
    },
  });
  const pending = revoke.isPending;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size={size} />}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Revocar la llave "{apiKey.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            Las integraciones que la usen dejarán de funcionar. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => revoke.mutate({ data: { id: apiKey.id } })}
            disabled={pending}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Revocar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
