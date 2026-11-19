import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { BatchUpload } from "~/features/batches/BatchUpload";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import { useBlockedReason } from "~/features/issuance/useBlockedReason";
import { canIssue } from "~/features/issuers/issuing";
import { issuersQuery } from "~/features/issuers/queries";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/documents/batches/new")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" }),
      queryClient.query({ ...issuersQuery, staleTime: "static" }),
    ]);
    return { crumb: "Emitir desde Excel" };
  },
  component: NewBatch,
});

function NewBatch() {
  const environment = useActiveEnvironment();
  const navigate = useNavigate();
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const blockedReason = useBlockedReason(environment);
  const usable = issuers.filter((issuer) => canIssue(issuer, environment));

  return (
    <>
      <PageHeader
        title="Emitir facturas desde Excel"
        lead="Sube hasta 1000 facturas en un archivo. Ves sus errores antes de enviarlas, y ninguna se numera hasta que todas estén bien."
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
        <BatchUpload
          key={environment}
          environment={environment}
          issuers={usable}
          blockedReason={blockedReason}
          onSent={async (batchId) => {
            await navigate({ to: "/documents/batches/$batchId", params: { batchId } });
          }}
        />
      )}
    </>
  );
}
