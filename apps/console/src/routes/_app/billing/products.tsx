import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { BillingProfileDialog } from "~/features/billing/BillingProfileDialog";
import { DebtAlert } from "~/features/billing/DebtAlert";
import { priced, purchasable } from "~/features/billing/labels";
import { type CatalogPeriod, catalogPeriods, PlanCatalog } from "~/features/billing/PlanCatalog";
import { PurchaseDialog } from "~/features/billing/PurchaseDialog";
import { billingProfileQuery, creditsQuery, planOffersQuery } from "~/features/billing/queries";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";

/** The price list, `?periodo=mensual|anual`; the account buys from it what it can buy now. */
export const Route = createFileRoute("/_app/billing/products")({
  validateSearch: (search): { periodo?: CatalogPeriod } => {
    const periodo = catalogPeriods.find((each) => each === search.periodo);
    return periodo ? { periodo } : {};
  },
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.query({ ...planOffersQuery, staleTime: "static" }),
      queryClient.query({ ...creditsQuery, staleTime: "static" }),
      queryClient.query({ ...billingProfileQuery, staleTime: "static" }),
    ]);
    return { crumb: "Planes y precios" };
  },
  component: Products,
});

function Products() {
  const { session } = Route.useRouteContext();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: offers } = useSuspenseQuery(planOffersQuery);
  const { data: credits } = useSuspenseQuery(creditsQuery);
  const { data: profile } = useSuspenseQuery(billingProfileQuery);
  const { manage } = useMemberPermissions();
  const impersonating = Boolean(session.impersonatedBy);
  const buyer = manage && !impersonating;
  const checkout = buyer && profile !== null && credits.debtOrderId === null;
  const period = search.periodo ?? (credits.productPackage ? "anual" : "mensual");

  return (
    <>
      <PageHeader
        title="Planes y precios"
        lead="Elige entre una suscripción mensual con excedente o un paquete anual prepagado."
      />

      {impersonating ? (
        <Alert>
          <AlertTitle>No disponible durante la sesión de soporte</AlertTitle>
          <AlertDescription>Las compras las hace la persona de la cuenta.</AlertDescription>
        </Alert>
      ) : (
        !manage && (
          <Alert>
            <AlertTitle>Solo lectura</AlertTitle>
            <AlertDescription>
              Las compras las hacen los dueños y administradores de la organización.
            </AlertDescription>
          </Alert>
        )
      )}
      {credits.debtOrderId !== null && <DebtAlert orderId={credits.debtOrderId} />}
      {buyer && profile === null && (
        <Alert>
          <AlertTitle>Completa el perfil de facturación</AlertTitle>
          <AlertDescription>
            Antes de comprar, indica a quién le emitimos la factura electrónica de la compra.
          </AlertDescription>
          <AlertAction>
            <BillingProfileDialog profile={null} />
          </AlertAction>
        </Alert>
      )}
      {credits.subscription !== null && (
        <Alert>
          <AlertTitle>{`Tienes la suscripción ${credits.subscription}`}</AlertTitle>
          <AlertDescription>
            Los documentos por encima de los del mes se cobran como excedente, así que no necesitas
            paquetes ni recargas. Puedes cambiar de plan en <Link to="/billing">Facturación</Link>.
          </AlertDescription>
        </Alert>
      )}

      <PlanCatalog
        offers={offers.filter(priced)}
        period={period}
        onPeriodChange={(periodo) => {
          void navigate({ search: { periodo }, replace: true, resetScroll: false });
        }}
        topupNote={
          credits.subscription === null && !credits.productPackage
            ? "Para comprar una recarga necesitas un paquete anual vigente."
            : undefined
        }
        renderAction={(offer) => {
          if (offer.kind === "SUBSCRIPTION" && offer.name === credits.subscription) {
            return <Badge variant="outline">Tu plan</Badge>;
          }
          if (!checkout || !purchasable(offer, credits)) {
            return null;
          }
          return (
            <PurchaseDialog
              offer={offer}
              version={offer.version}
              profile={profile}
              variant={offer.kind === "TOPUP" ? "outline" : "default"}
            />
          );
        }}
      />
    </>
  );
}
