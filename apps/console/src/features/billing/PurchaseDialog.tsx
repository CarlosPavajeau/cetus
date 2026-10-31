import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Entry } from "~/components/DetailSection";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import type { BillingProfile, PlanOffer, PlanVersion } from "~/lib/api/types";

import {
  documentsLabel,
  formatCents,
  issuersLabel,
  overageLabel,
  planKindLabel,
  priceBreakdown,
  validityLabel,
} from "./labels";
import { createOrder } from "./server";

/**
 * The summary of a purchase and the way to Wompi's checkout. The order is placed here; Wompi confirms the
 * payment to Cetus on its own, and the page it sends the customer back to only reads the order.
 */
export function PurchaseDialog({
  offer,
  version,
  profile,
}: {
  offer: PlanOffer;
  version: PlanVersion;
  profile: BillingProfile;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const purchase = useMutation({
    mutationFn: () => createOrder({ data: { planVersionId: version.id } }),
    onSuccess: async (result) => {
      if (!result.ok) {
        return;
      }
      if (result.order.checkout) {
        window.location.assign(result.order.checkout.link);
        return;
      }
      await navigate({ to: "/billing/orders/$orderId", params: { orderId: result.order.id } });
    },
  });
  const failure =
    purchase.data && !purchase.data.ok
      ? purchase.data.message
      : purchase.error
        ? "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo."
        : null;
  // Kept busy after a success too: the browser is on its way to Wompi.
  const busy = purchase.isPending || (purchase.data?.ok ?? false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && busy) {
          return;
        }
        setOpen(next);
        if (next) {
          purchase.reset();
        }
      }}
    >
      <DialogTrigger render={<Button />}>Comprar</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Comprar {offer.name}</DialogTitle>
          <DialogDescription>
            {offer.kind === "SUBSCRIPTION"
              ? "Pagas en Wompi el primer mes con tarjeta, PSE, Nequi u otros medios. La suscripción empieza cuando Wompi confirma el pago; cada mes recibirás la orden de renovación con el excedente del mes anterior."
              : "Pagas en Wompi con tarjeta, PSE, Nequi u otros medios. Los créditos se acreditan cuando Wompi confirma el pago."}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Entry label="Producto">{planKindLabel[offer.kind]}</Entry>
          <Entry label="Incluye">
            {documentsLabel(version.documentsIncluded)}
            {offer.kind === "SUBSCRIPTION" && " al mes"}
          </Entry>
          {version.issuersIncluded !== null && (
            <Entry label="Emisores">{issuersLabel(version.issuersIncluded)}</Entry>
          )}
          {offer.validityMonths !== null && (
            <Entry label="Vigencia">{validityLabel(offer.validityMonths)}</Entry>
          )}
          {version.priceOverageCents !== null && (
            <Entry label="Excedente">{overageLabel(version.priceOverageCents)}</Entry>
          )}
          <Entry label="Total">
            <span className="text-sm font-medium tabular-nums">
              {formatCents(version.totalCents)}
            </span>
            <span className="block text-muted-foreground">{priceBreakdown(version)}</span>
          </Entry>
          <Entry label="Factura a nombre de">
            {profile.legalName}
            <span className="block text-muted-foreground">{profile.email}</span>
          </Entry>
        </dl>
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />} disabled={busy}>
            Cancelar
          </DialogClose>
          <Button onClick={() => purchase.mutate()} disabled={busy}>
            {busy && <Spinner data-icon="inline-start" />}
            Ir a pagar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
