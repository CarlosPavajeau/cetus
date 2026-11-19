import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheetIcon, PlusIcon } from "lucide-react";

import { PageHeader } from "~/components/PageHeader";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Progress } from "~/components/ui/progress";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { BatchStatusBadge } from "~/features/batches/BatchStatusBadge";
import { countFinished, progressOf } from "~/features/batches/labels";
import { batchesQuery } from "~/features/batches/queries";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { activeEnvironmentQuery, useActiveEnvironment } from "~/features/environment/queries";
import type { BatchView } from "~/lib/api/types";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/_app/documents/batches/")({
  loader: async ({ context: { queryClient } }) => {
    const environment = await queryClient.query({ ...activeEnvironmentQuery, staleTime: "static" });
    await queryClient.infiniteQuery({ ...batchesQuery(environment), staleTime: "static" });
    return { crumb: "Lotes" };
  },
  component: Batches,
});

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function Batches() {
  const environment = useActiveEnvironment();
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    batchesQuery(environment),
  );
  const batches = data.pages.flatMap((page) => page.items);

  return (
    <>
      <PageHeader
        title="Lotes de facturas"
        lead={`Los archivos de facturas enviados en ${environmentLabel[environment].toLowerCase()}.`}
        action={
          <Link to="/documents/batches/new" className={cn(buttonVariants())}>
            <PlusIcon data-icon="inline-start" />
            Emitir desde Excel
          </Link>
        }
      />
      {batches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileSpreadsheetIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no hay lotes</EmptyTitle>
            <EmptyDescription>
              Sube la plantilla de Excel con tus facturas para emitirlas todas de una vez.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link to="/documents/batches/new" className={cn(buttonVariants())}>
              Emitir desde Excel
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <section className="flex flex-col gap-4" aria-label="Tus lotes">
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-11">
                <TableRow>
                  <TableHead className="px-5">Archivo</TableHead>
                  <TableHead>Emisor</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead className="w-48">Avance</TableHead>
                  <TableHead className="pr-5">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <BatchRow key={batch.id} batch={batch} />
                ))}
              </TableBody>
            </Table>
          </div>
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && <Spinner data-icon="inline-start" />}
                {isFetchingNextPage ? "Cargando…" : "Ver más"}
              </Button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function BatchRow({ batch }: { batch: BatchView }) {
  return (
    <TableRow>
      <TableCell className="px-5 py-4">
        <div className="flex flex-col gap-0.75">
          <Link
            to="/documents/batches/$batchId"
            params={{ batchId: batch.id }}
            className="w-fit font-medium break-all hover:underline hover:underline-offset-4"
          >
            {batch.fileName ?? "Lote sin archivo"}
          </Link>
          <span className="text-2xs text-muted-foreground tabular-nums">
            {batch.items === 1 ? "1 factura" : `${batch.items} facturas`}
          </span>
        </div>
      </TableCell>
      <TableCell>{batch.issuerName}</TableCell>
      <TableCell className="tabular-nums">{dateTime.format(new Date(batch.createdAt))}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Progress value={progressOf(batch)} aria-label="Avance del lote" />
          <span className="text-2xs text-muted-foreground tabular-nums">
            {countFinished(batch.counts)} de {batch.items}
          </span>
        </div>
      </TableCell>
      <TableCell className="pr-5">
        <BatchStatusBadge status={batch.status} />
      </TableCell>
    </TableRow>
  );
}
