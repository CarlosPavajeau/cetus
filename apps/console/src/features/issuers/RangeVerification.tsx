import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { NumberingRange } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { verifyRange } from "./server";

type Status = NonNullable<NumberingRange["verificationStatus"]>;

const label: Record<Status, string> = {
  PENDING: "Consultando",
  VERIFIED: "Coincide",
  MISMATCH: "No coincide",
  ERROR: "Sin respuesta",
};

const dot: Record<Status, string> = {
  PENDING: "bg-sky-500",
  VERIFIED: "bg-emerald-500",
  MISMATCH: "bg-destructive",
  ERROR: "bg-amber-500",
};

/**
 * Whether the DIAN has this invoice range as registered (GetNumberingRange): same prefix, numbers,
 * validity and technical key. A difference means rejected invoices or invalid CUFEs, so it can be
 * checked again after fixing it in the DIAN portal or here.
 */
export function RangeVerification({
  issuerId,
  range,
}: {
  issuerId: string;
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
  const status = range.verificationStatus;
  const failed = status === "MISMATCH" || status === "ERROR";
  const badge = (
    <Badge variant="outline" className={cn(!status && "text-muted-foreground")}>
      {status && <span className={cn("size-1.5 rounded-full", dot[status])} aria-hidden />}
      {status ? label[status] : "Sin consultar"}
    </Badge>
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
