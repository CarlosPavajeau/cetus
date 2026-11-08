import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRoundIcon, RefreshCwIcon } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
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
import { type BadgeStatus, StatusBadge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { IssuerDetail, NumberingRange } from "~/lib/api/types";

import { requestDianTechnicalKey, verifyRange } from "./server";
import { pendingVerification } from "./verification";

type Status = NonNullable<NumberingRange["verificationStatus"]>;

const label: Record<Status, string> = {
  PENDING: "Consultando",
  VERIFIED: "Coincide",
  MISMATCH: "No coincide",
  ERROR: "Sin respuesta",
};

const badgeStatus: Record<Status, BadgeStatus> = {
  PENDING: "pending",
  VERIFIED: "success",
  MISMATCH: "error",
  ERROR: "warning",
};

/**
 * Whether the DIAN has this production invoice range as registered (GetNumberingRange): same prefix, numbers,
 * validity and technical key. A difference means rejected invoices or invalid CUFEs, so it can be
 * checked again after fixing it in the DIAN portal or here.
 */
export function RangeVerification({
  issuerId,
  environment,
  range,
  readOnly,
}: {
  issuerId: string;
  environment: IssuerDetail["environment"];
  range: NumberingRange;
  /** Without the button to check it again: only owners and admins change the issuers. */
  readOnly: boolean;
}) {
  const queryClient = useQueryClient();
  const verify = useMutation({
    mutationFn: verifyRange,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["issuers", issuerId] }),
  });

  if (range.documentType !== "INVOICE") {
    return <span className="text-muted-foreground">—</span>;
  }
  // Habilitación numbers from the DIAN's shared test range, which GetNumberingRange does not know.
  if (environment !== "LIVE") {
    return <span className="text-muted-foreground">No aplica</span>;
  }
  const status = range.verificationStatus;
  const pending = pendingVerification(range);
  const unanswered = pending === "unanswered" || pending === "askAgain";
  const failed = status === "MISMATCH" || status === "ERROR";
  const badge = unanswered ? (
    <StatusBadge status="warning">Sin respuesta</StatusBadge>
  ) : (
    <StatusBadge status={status ? badgeStatus[status] : "idle"}>
      {status ? label[status] : "Sin consultar"}
    </StatusBadge>
  );
  const hint = unanswered
    ? pending === "askAgain"
      ? "La DIAN no respondió. Puedes consultarla de nuevo."
      : "La DIAN no ha respondido. Si no responde, podrás consultarla de nuevo en unos minutos."
    : failed
      ? range.verificationError
      : null;
  const canAskAgain = status !== "PENDING" ? status !== "VERIFIED" : pending === "askAgain";

  return (
    <div className="flex items-center gap-1">
      {hint ? (
        <Tooltip>
          <TooltipTrigger render={<span className="w-fit cursor-help" />}>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-72">{hint}</TooltipContent>
        </Tooltip>
      ) : (
        badge
      )}
      {!readOnly && canAskAgain && (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="Consultar de nuevo a la DIAN"
          title={verify.error?.message ?? "Consultar de nuevo a la DIAN"}
          disabled={verify.isPending}
          onClick={() => verify.mutate({ data: { id: issuerId, rangeId: range.id } })}
        >
          {verify.isPending ? <Spinner /> : <RefreshCwIcon />}
        </Button>
      )}
      {!readOnly && status === "MISMATCH" && (
        <TechnicalKeyFromDian issuerId={issuerId} rangeId={range.id} />
      )}
    </div>
  );
}

/**
 * Replaces the range's technical key with the DIAN's. The DIAN portal does not show the key, so a typed one
 * is easily something else, such as the software code.
 */
function TechnicalKeyFromDian({ issuerId, rangeId }: { issuerId: string; rangeId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const request = useMutation({
    mutationFn: requestDianTechnicalKey,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["issuers", issuerId] });
      setOpen(false);
    },
  });
  const pending = request.isPending;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        request.reset();
      }}
    >
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Usar la clave técnica de la DIAN"
            title="Usar la clave técnica de la DIAN"
          />
        }
      >
        <KeyRoundIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Usar la clave técnica de la DIAN?</AlertDialogTitle>
          <AlertDialogDescription>
            Reemplazaremos la clave técnica de este rango por la que la DIAN tiene registrada para
            tu software y prefijo. Mientras la consultamos, que suele tardar unos segundos, este
            rango no emite facturas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {request.error && (
          <Alert variant="destructive">
            <AlertDescription>{request.error.message}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => request.mutate({ data: { id: issuerId, rangeId } })}
            disabled={pending}
          >
            {pending && <Spinner data-icon="inline-start" />}
            Usar la clave de la DIAN
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
