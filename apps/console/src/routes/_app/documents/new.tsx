import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BuildingIcon } from "lucide-react";

import { PageHeader } from "~/components/PageHeader";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { documentsQuery } from "~/features/documents/queries";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { InvoiceForm } from "~/features/issuance/InvoiceForm";
import { useBlockedReason } from "~/features/issuance/useBlockedReason";
import { issuersQuery } from "~/features/issuers/queries";
import type { Environment, Issuer } from "~/lib/api/types";

export const Route = createFileRoute("/_app/documents/new")({
  loader: async ({ context: { queryClient } }) => {
    const environment = await queryClient.ensureQueryData(activeEnvironmentQuery);
    await Promise.all([
      queryClient.ensureQueryData(issuersQuery),
      queryClient.ensureInfiniteQueryData(documentsQuery({ environment })),
    ]);
    return { crumb: "Emitir factura" };
  },
  component: NewInvoice,
});

/** What the API lets issue: an enabled issuer, or one in habilitación with the TEST environment. */
function canIssue(issuer: Issuer, environment: Environment) {
  return (
    issuer.environment === environment &&
    (issuer.status === "ENABLED" || (environment === "TEST" && issuer.status === "TESTING"))
  );
}

const leads: Record<Environment, string> = {
  SANDBOX:
    "Una factura de prueba: recorre todo el ciclo sin enviarse a la DIAN ni tener validez fiscal.",
  TEST: "Una factura de habilitación: va a la DIAN de pruebas, sin validez fiscal.",
  LIVE: "Una factura real: va a la DIAN con validez fiscal y le llega a tu cliente por correo.",
};

function NewInvoice() {
  const environment = useActiveEnvironment();
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const { data: documents } = useSuspenseInfiniteQuery(documentsQuery({ environment }));
  const blockedReason = useBlockedReason(environment);
  const usable = issuers.filter((issuer) => canIssue(issuer, environment));
  const firstSandboxInvoice =
    environment === "SANDBOX" && documents.pages.every((page) => page.items.length === 0);

  return (
    <>
      <PageHeader title="Emitir factura" lead={leads[environment]} />
      {usable.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BuildingIcon />
            </EmptyMedia>
            <EmptyTitle>
              No tienes emisores listos en {environmentLabel[environment].toLowerCase()}
            </EmptyTitle>
            <EmptyDescription>
              Termina de configurar un emisor para este ambiente, o cambia de ambiente arriba.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/issuers" />} nativeButton={false}>
              Ver emisores
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        // Remounted per environment, so the issuer and the key never carry over.
        <InvoiceForm
          key={environment}
          environment={environment}
          issuers={usable}
          sample={firstSandboxInvoice}
          blockedReason={blockedReason}
        />
      )}
    </>
  );
}
