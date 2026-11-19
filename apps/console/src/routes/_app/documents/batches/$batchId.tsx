import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { DownloadIcon, FileSearchIcon } from "lucide-react";
import { useEffect, useRef } from "react";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import { countFinished, progressOf, statusesOpen, stopReasonText } from "~/features/batches/labels";
import { batchDocumentsKey, batchDocumentsQuery, batchQuery } from "~/features/batches/queries";
import { getBatchResult } from "~/features/batches/server";
import { DocumentStatusBadge } from "~/features/documents/DocumentStatusBadge";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import type { BatchView } from "~/lib/api/types";
import { cn, uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/documents/batches/$batchId")({
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.batchId)) {
      throw notFound();
    }
    const batch = await queryClient.query({ ...batchQuery(params.batchId), staleTime: "static" });
    if (!batch) {
      throw notFound();
    }
    return { crumb: batch.fileName ?? "Lote", environment: batch.environment };
  },
  component: BatchPage,
  notFoundComponent: BatchNotFound,
});

const dateTime = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" });

function BatchPage() {
  const { batchId } = Route.useParams();
  const { data: batch } = useSuspenseQuery(batchQuery(batchId));
  if (!batch) {
    return <BatchNotFound />;
  }
  return <BatchDetail batch={batch} />;
}

function BatchDetail({ batch }: { batch: BatchView }) {
  const open = statusesOpen.includes(batch.status);
  const { data, hasNextPage, fetchNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    batchDocumentsQuery(batch.id),
  );
  const queryClient = useQueryClient();
  const progress = `${batch.status}:${countFinished(batch.counts)}:${batch.counts.notCreated}`;
  const progressSeen = useRef(progress);
  useEffect(() => {
    if (progressSeen.current === progress) {
      return;
    }
    progressSeen.current = progress;
    void queryClient.invalidateQueries({ queryKey: batchDocumentsKey(batch.id) });
  }, [progress, batch.id, queryClient]);
  const documents = data.pages.flatMap((page) => page.items);
  const download = useMutation({
    mutationFn: async () => {
      const csv = await getBatchResult({ data: { id: batch.id } });
      // Decoding the response drops the BOM, and Excel needs it to read the file as UTF-8.
      const bom = csv.startsWith("\uFEFF") ? "" : "\uFEFF";
      const url = URL.createObjectURL(new Blob([bom, csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(batch.fileName ?? "lote").replace(/\.(xlsx|csv)$/i, "")}-resultado.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url));
    },
  });
  const counts = [
    { label: "Aceptadas", value: batch.counts.accepted },
    { label: "Rechazadas", value: batch.counts.rejected },
    { label: "Fallidas", value: batch.counts.failed },
    { label: "En proceso", value: batch.counts.pending },
    { label: batch.stopReason ? "No creadas" : "Por crear", value: batch.counts.notCreated },
  ];

  return (
    <>
      <PageHeader
        title={batch.fileName ?? "Lote de facturas"}
        status={<BatchStatusBadge batch={batch} />}
        summary={`${batch.issuerName} · ${environmentLabel[batch.environment]} · enviado el ${dateTime.format(new Date(batch.createdAt))}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/documents"
              search={{ batchId: batch.id }}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Ver en documentos
            </Link>
            <Button onClick={() => download.mutate()} disabled={download.isPending}>
              {download.isPending ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <DownloadIcon data-icon="inline-start" />
              )}
              Descargar el resultado
            </Button>
          </div>
        }
      />

      {download.isError && (
        <Alert variant="destructive">
          <AlertTitle>No pudimos descargar el resultado</AlertTitle>
          <AlertDescription>Revisa tu conexión e inténtalo de nuevo.</AlertDescription>
        </Alert>
      )}
      {batch.stopReason && (
        <Alert variant="destructive">
          <AlertTitle>El lote se detuvo antes de crear todas sus facturas</AlertTitle>
          <AlertDescription>
            {stopReasonText(batch.stopReason)}{" "}
            {batch.counts.notCreated === 1
              ? "La factura que falta no se numeró: descarga el resultado para ver cuál y envíala en otro lote cuando resuelvas la causa."
              : `Las ${batch.counts.notCreated} facturas que faltan no se numeraron: descarga el resultado para ver cuáles y envíalas en otro lote cuando resuelvas la causa.`}
          </AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-4" aria-label="Avance">
        <div className="flex flex-col gap-2">
          <Progress value={progressOf(batch)} aria-label="Avance del lote" />
          <p className="text-sm text-muted-foreground tabular-nums">
            {batch.status === "RECEIVED"
              ? "En espera: las facturas se crean en unos segundos."
              : `${countFinished(batch.counts)} de ${batch.items} ${batch.items === 1 ? "factura terminada" : "facturas terminadas"}.`}
            {batch.waiting &&
              " En espera: las facturas que faltan se crean cuando llegue su turno."}
            {open && " Te enviamos un correo cuando el lote termine."}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-4 rounded-md border p-4 text-sm sm:grid-cols-5">
          {counts.map((count) => (
            <div key={count.label}>
              <dt className="text-muted-foreground">{count.label}</dt>
              <dd className="text-lg tabular-nums">{count.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="flex flex-col gap-4" aria-label="Facturas del lote">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted/50 [&_th]:h-11">
              <TableRow>
                <TableHead className="w-20 px-5">#</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Número</TableHead>
                <TableHead className="pr-5">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Aún no hay facturas creadas.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="px-5 tabular-nums">{document.position + 1}</TableCell>
                    <TableCell className="break-all">{document.reference}</TableCell>
                    <TableCell>
                      <Link
                        to="/documents/$documentId"
                        params={{ documentId: document.id }}
                        className="font-medium tabular-nums hover:underline hover:underline-offset-4"
                      >
                        {document.number}
                      </Link>
                    </TableCell>
                    <TableCell className="pr-5">
                      <div className="flex flex-col gap-1">
                        <DocumentStatusBadge
                          status={document.status}
                          environment={batch.environment}
                        />
                        {document.statusMessage && (
                          <span className="text-2xs whitespace-normal text-muted-foreground">
                            {document.statusMessage}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {hasNextPage && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage && <Spinner data-icon="inline-start" />}
              {isFetchingNextPage ? "Cargando…" : "Ver más"}
            </Button>
          </div>
        )}
        <p className="text-2xs text-muted-foreground">En el orden del archivo</p>
      </section>
    </>
  );
}

function BatchNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileSearchIcon />
        </EmptyMedia>
        <EmptyTitle>No encontramos este lote</EmptyTitle>
        <EmptyDescription>No existe o es de otra organización.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/documents/batches" className={cn(buttonVariants())}>
          Ver los lotes
        </Link>
      </EmptyContent>
    </Empty>
  );
}
