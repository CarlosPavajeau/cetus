import { useSuspenseInfiniteQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BuildingIcon } from "lucide-react";

import { PageHeader } from "~/components/PageHeader";
import { buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { documentDetailQuery, documentsQuery } from "~/features/documents/queries";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { InvoiceForm } from "~/features/issuance/InvoiceForm";
import { invoiceDraft, reissueTarget } from "~/features/issuance/reissue";
import { useBlockedReason } from "~/features/issuance/useBlockedReason";
import { canIssue } from "~/features/issuers/issuing";
import { issuersQuery } from "~/features/issuers/queries";
import type { Environment } from "~/lib/api/types";
import { cn, uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/documents/new")({
  validateSearch: (search: Record<string, unknown>): { from?: string } =>
    typeof search.from === "string" && uuidPattern.test(search.from) ? { from: search.from } : {},
  loaderDeps: ({ search }) => ({ from: search.from }),
  loader: async ({ context: { queryClient }, deps }) => {
    const [active, source] = await Promise.all([
      queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" }),
      deps.from
        ? queryClient.query({ ...documentDetailQuery(deps.from), staleTime: "static" })
        : null,
      queryClient.query({ ...issuersQuery, staleTime: "static" }),
    ]);
    // A copy is issued in the environment of the invoice it comes from, whatever the selector says.
    const reissued = source && reissueTarget(source)?.kind === "invoice" ? source : null;
    const environment = reissued?.environment ?? active;
    await queryClient.infiniteQuery({ ...documentsQuery({ environment }), staleTime: "static" });
    return reissued
      ? { crumb: "Emitir de nuevo", environment, source: reissued }
      : { crumb: "Emitir factura", source: null };
  },
  component: NewInvoice,
});

const leads: Record<Environment, string> = {
  SANDBOX:
    "Una factura de prueba: recorre todo el ciclo sin enviarse a la DIAN ni tener validez fiscal.",
  TEST: "Una factura de habilitación: va a la DIAN de pruebas, sin validez fiscal.",
  LIVE: "Una factura real: va a la DIAN con validez fiscal y le llega a tu cliente por correo.",
};

function NewInvoice() {
  const { source } = Route.useLoaderData();
  const active = useActiveEnvironment();
  const environment = source?.environment ?? active;
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const { data: documents } = useSuspenseInfiniteQuery(documentsQuery({ environment }));
  const blockedReason = useBlockedReason(environment);
  const usable = issuers.filter((issuer) => canIssue(issuer, environment));
  const draft =
    source &&
    invoiceDraft(
      source,
      usable.map((issuer) => issuer.id),
    );
  const firstSandboxInvoice =
    !draft && environment === "SANDBOX" && documents.pages.every((page) => page.items.length === 0);

  return (
    <>
      <PageHeader
        title={draft ? "Emitir factura de nuevo" : "Emitir factura"}
        lead={leads[environment]}
      />
      {usable.length === 0 ? (
        <Empty>
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
            <Link to="/issuers" className={cn(buttonVariants())}>
              Ver emisores
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        // Remounted per environment and per copied invoice, so the issuer and the key never carry over.
        <InvoiceForm
          key={`${environment}-${draft?.id ?? "new"}`}
          environment={environment}
          issuers={usable}
          sample={firstSandboxInvoice}
          draft={draft}
          blockedReason={blockedReason}
        />
      )}
    </>
  );
}
