import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { BillingProfileDialog } from "~/features/billing/BillingProfileDialog";
import { DebtAlert } from "~/features/billing/DebtAlert";
import {
  documentsLabel,
  formatCents,
  issuersLabel,
  overageLabel,
  planKindLabel,
  priceBreakdown,
  purchasable,
  validityLabel,
} from "~/features/billing/labels";
import { PurchaseDialog } from "~/features/billing/PurchaseDialog";
import { billingProfileQuery, creditsQuery, planOffersQuery } from "~/features/billing/queries";
import { useMemberPermissions } from "~/features/session/useMemberPermissions";

/** The subscriptions, packages and top-ups the account can buy now, at their final price. */
export const Route = createFileRoute("/_app/billing/products")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.query({ ...planOffersQuery, staleTime: "static" }),
      queryClient.query({ ...creditsQuery, staleTime: "static" }),
      queryClient.query({ ...billingProfileQuery, staleTime: "static" }),
    ]);
    return { crumb: "Comprar créditos" };
  },
  component: Products,
});

function Products() {
  const { session } = Route.useRouteContext();
  const { data: offers } = useSuspenseQuery(planOffersQuery);
  const { data: credits } = useSuspenseQuery(creditsQuery);
  const { data: profile } = useSuspenseQuery(billingProfileQuery);
  const { manage } = useMemberPermissions();
  const impersonating = Boolean(session.impersonatedBy);
  const buyer = manage && !impersonating;
  const products = offers.filter((offer) => purchasable(offer, credits));

  return (
    <>
      <PageHeader
        title="Comprar créditos"
        lead="Una suscripción mensual trae los documentos de cada mes y cobra el excedente al cierre. Un paquete anual trae los créditos y los emisores de producción de un año, y las recargas le suman créditos por 12 meses desde la compra. Los precios son finales."
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
      {credits.subscription !== null ? (
        <Alert>
          <AlertTitle>{`Tienes la suscripción ${credits.subscription}`}</AlertTitle>
          <AlertDescription>
            Los documentos por encima de los del mes se cobran como excedente, así que no necesitas
            paquetes ni recargas. Puedes cambiar de plan desde Facturación.
          </AlertDescription>
        </Alert>
      ) : (
        !credits.productPackage && (
          <p className="text-sm text-muted-foreground">
            Las recargas aparecen cuando tienes un paquete anual vigente.
          </p>
        )
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((offer) => (
          <Card key={offer.id}>
            <CardHeader>
              <CardDescription>{planKindLabel[offer.kind]}</CardDescription>
              <CardTitle>{offer.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-2xl font-semibold tabular-nums">
                {formatCents(offer.version.totalCents)}
                {offer.kind === "SUBSCRIPTION" && (
                  <span className="text-sm font-normal text-muted-foreground"> al mes</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{priceBreakdown(offer.version)}</p>
              <ul className="flex flex-col gap-1 text-sm">
                <li>{documentsLabel(offer.version.documentsIncluded)}</li>
                {offer.version.issuersIncluded !== null && (
                  <li>{issuersLabel(offer.version.issuersIncluded)}</li>
                )}
                {offer.validityMonths !== null && <li>{validityLabel(offer.validityMonths)}</li>}
                {offer.version.priceOverageCents !== null && (
                  <li>{overageLabel(offer.version.priceOverageCents)}</li>
                )}
              </ul>
            </CardContent>
            {buyer && profile !== null && credits.debtOrderId === null && (
              <CardFooter>
                <PurchaseDialog offer={offer} version={offer.version} profile={profile} />
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
