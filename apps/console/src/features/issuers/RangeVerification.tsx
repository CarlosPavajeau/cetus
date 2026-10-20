import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";

import { type BadgeStatus, StatusBadge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { IssuerDetail, NumberingRange } from "~/lib/api/types";

import { verifyRange } from "./server";

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
}: {
  issuerId: string;
  environment: IssuerDetail["environment"];
  range: NumberingRange;
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
  const failed = status === "MISMATCH" || status === "ERROR";
  const badge = (
    <StatusBadge status={status ? badgeStatus[status] : "idle"}>
      {status ? label[status] : "Sin consultar"}
    </StatusBadge>
  );

  return (
    <div className="flex items-center gap-1">
      {failed && range.verificationError ? (
        <Tooltip>
          <TooltipTrigger render={<span className="w-fit cursor-help" />}>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-72">{range.verificationError}</TooltipContent>
        </Tooltip>
      ) : (
        badge
      )}
      {status !== "PENDING" && status !== "VERIFIED" && (
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
    </div>
  );
}
