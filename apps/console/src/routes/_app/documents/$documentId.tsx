import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  FileMinusIcon,
  FilePenLineIcon,
  FilePlusIcon,
  FileTextIcon,
  FileXIcon,
  FingerprintIcon,
} from "lucide-react";
import { useId, useState } from "react";

import { CopyButton } from "~/components/CopyButton";
import { Entry, Section } from "~/components/DetailSection";
import { EnvironmentBadge } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDateTime } from "~/features/api-keys/formats";
import { CancelInvoice, isCancellationBlocked } from "~/features/documents/CancelInvoice";
import { DianErrors } from "~/features/documents/DianErrors";
import { DocumentDownloads } from "~/features/documents/DocumentDownloads";
import { DocumentStatusBadge } from "~/features/documents/DocumentStatusBadge";
import {
  conceptLabel,
  deliveryStatusLabel,
  describeEvent,
  documentLead,
  documentTypeLabel,
  formatDay,
  formatMoney,
  identificationTypeLabel,
} from "~/features/documents/labels";
import { documentDetailQuery } from "~/features/documents/queries";
import { ResendDocument } from "~/features/documents/ResendDocument";
import { useBlockedReason } from "~/features/issuance/useBlockedReason";
import type { DocumentDetail } from "~/lib/api/types";
import { cn, uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/documents/$documentId")({
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.documentId)) {
      throw notFound();
    }
    const document = await queryClient.ensureQueryData(documentDetailQuery(params.documentId));
    if (!document) {
      throw notFound();
    }
    return { crumb: document.number, environment: document.environment };
  },
  component: DocumentDetailPage,
  notFoundComponent: DocumentNotFound,
});

const quantityFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 6 });
const percentFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

function BackToDocuments() {
  return (
    <Link
      to="/documents"
      className="flex w-fit items-center gap-1.75 text-xs text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-3.5" />
      Todos los documentos
    </Link>
  );
}

function DocumentDetailPage() {
  const { documentId } = Route.useParams();
  // The loader already returned notFound for a missing document.
  const document = useSuspenseQuery(documentDetailQuery(documentId)).data!;
  const money = (amount: number) => formatMoney(amount, document.currency);
  const isInvoice = document.documentType === "INVOICE";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <BackToDocuments />

      <PageHeader
        title={`${documentTypeLabel[document.documentType]} ${document.number}`}
        status={<DocumentStatusBadge status={document.status} />}
        lead={documentLead(document.status, document.environment)}
        action={
          <div className="flex flex-wrap items-start gap-2">
            {isInvoice && document.status === "ACCEPTED" && (
              <InvoiceCorrections invoice={document} />
            )}
            <DocumentDownloads documentId={document.id} />
          </div>
        }
      />

      <DianErrors document={document} />

      <section
        className="flex min-h-16 flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-md border bg-card px-5 py-3"
        aria-label={isInvoice ? "CUFE" : "CUDE"}
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <FingerprintIcon className="size-4 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-2xs text-muted-foreground">{isInvoice ? "CUFE" : "CUDE"}</span>
            <div className="flex min-w-0 items-center gap-2">
              <code className="truncate text-sm" data-testid="document-cufe">
                {document.cufe ?? "Se calcula al firmar el documento"}
              </code>
              <EnvironmentBadge environment={document.environment} />
            </div>
          </div>
        </div>
        {document.cufe && (
          <CopyButton value={document.cufe} label={`Copiar ${isInvoice ? "CUFE" : "CUDE"}`} />
        )}
      </section>

      {!isInvoice && document.invoice && <CorrectedInvoice document={document} />}

      <Section id="parties" title="Emisor y cliente">
        <dl className="grid gap-x-10 gap-y-3.25 sm:grid-cols-2 lg:grid-cols-4">
          <Entry label="Emisor">
            <Link
              to="/issuers/$issuerId"
              params={{ issuerId: document.issuer.id }}
              className="underline-offset-4 hover:underline"
            >
              {document.issuer.legalName}
            </Link>
          </Entry>
          <Entry label="NIT del emisor">
            {document.issuer.nit}
            {document.issuer.checkDigit && `-${document.issuer.checkDigit}`}
          </Entry>
          <Entry label="Cliente">{document.customer.legalName}</Entry>
          <Entry label="Identificación del cliente">
            {identificationTypeLabel[document.customer.identificationType] ??
              document.customer.identificationType}{" "}
            {document.customer.identificationNumber}
            {document.customer.checkDigit && `-${document.customer.checkDigit}`}
          </Entry>
          <Entry label="Correo del cliente">{document.customer.email ?? "—"}</Entry>
          <Entry label="Fecha de emisión">{formatDay(document.issueDate)}</Entry>
          {document.dueDate && <Entry label="Vencimiento">{formatDay(document.dueDate)}</Entry>}
          <Entry label="Referencia externa">{document.externalReference ?? "—"}</Entry>
        </dl>
      </Section>

      <Section id="lines" title="Detalle">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-sidebar [&_th]:h-8.75">
              <TableRow>
                <TableHead className="pl-4">Descripción</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unitario</TableHead>
                <TableHead className="pr-4 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {document.lines.map((line) => (
                <TableRow key={line.lineNumber}>
                  <TableCell className="pl-4 text-2xs whitespace-normal">
                    {line.description}
                    {line.itemCode && (
                      <span className="ml-1.5 text-muted-foreground">{line.itemCode}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-2xs tabular-nums">
                    {quantityFormat.format(line.quantity)}
                  </TableCell>
                  <TableCell className="text-right text-2xs tabular-nums">
                    {money(line.unitPrice)}
                  </TableCell>
                  <TableCell className="pr-4 text-right text-2xs tabular-nums">
                    {money(line.lineExtension)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="text-2xs">
              <TableRow>
                <TableCell colSpan={3} className="pl-4 text-right">
                  Subtotal
                </TableCell>
                <TableCell className="pr-4 text-right tabular-nums">
                  {money(document.totals.lineExtension)}
                </TableCell>
              </TableRow>
              {document.taxes.map((tax) => (
                <TableRow key={`${tax.type}-${tax.percent}`}>
                  <TableCell colSpan={3} className="pl-4 text-right">
                    {tax.type} {percentFormat.format(tax.percent)} % sobre {money(tax.taxable)}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">
                    {money(tax.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="pl-4 text-right font-medium">
                  Total
                </TableCell>
                <TableCell className="pr-4 text-right font-medium tabular-nums">
                  {money(document.totals.payable)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Section>

      {isInvoice && <InvoiceNotes document={document} />}

      <Section
        id="deliveries"
        title="Entrega al cliente"
        action={<ResendDocument document={document} />}
      >
        {document.deliveries.length === 0 ? (
          <p className="text-2xs text-muted-foreground">
            {document.status === "ACCEPTED"
              ? "Cetus está preparando el correo con el PDF y el AttachedDocument."
              : "Se envía por correo al cliente cuando la DIAN acepta el documento."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {document.deliveries.map((delivery) => (
              <li key={delivery.id} className="flex flex-col gap-0.5 text-2xs">
                <span>
                  <span className="font-medium">{deliveryStatusLabel[delivery.status]}</span>
                  {" · "}
                  {delivery.recipient ?? "Sin destinatario"}
                  {delivery.sentAt && ` · ${formatDateTime(new Date(delivery.sentAt))}`}
                </span>
                {delivery.error && <span className="text-muted-foreground">{delivery.error}</span>}
                {["SKIPPED", "BOUNCED", "COMPLAINED", "FAILED"].includes(delivery.status) && (
                  <span className="text-muted-foreground">
                    El cliente no lo recibió por correo: entrégale el PDF y el AttachedDocument por
                    tu cuenta.
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="timeline" title="Historial">
        <ol className="flex flex-col gap-3 border-l pl-4">
          {document.events.map((event) => {
            const { title, detail } = describeEvent(event);
            return (
              <li
                key={`${event.at}-${event.kind}-${event.status}-${event.message}`}
                className="relative flex flex-col gap-0.5 text-2xs"
              >
                <span
                  className="absolute top-1.5 -left-[1.29rem] size-1.5 rounded-full bg-muted-foreground"
                  aria-hidden
                />
                <span className="font-medium">{title}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatDateTime(new Date(event.at))}
                </span>
                {detail && <span className="break-words text-muted-foreground">{detail}</span>}
              </li>
            );
          })}
        </ol>
        <p className="text-2xs text-muted-foreground">Horarios de Colombia (UTC−5)</p>
      </Section>
    </div>
  );
}

/**
 * The notes and the cancellation of an accepted invoice. Each one issues another document in the invoice's
 * environment, so in LIVE they follow who may issue there.
 */
function InvoiceCorrections({ invoice }: { invoice: DocumentDetail }) {
  const blockedReason = useBlockedReason(invoice.environment);
  const [cancelling, setCancelling] = useState(false);
  const cancellationBlocked = isCancellationBlocked(invoice);
  const cancellationReasonId = useId();

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" className="group" disabled={blockedReason !== null} />}
        >
          <FilePenLineIcon data-icon="inline-start" />
          Corregir factura
          <ChevronDownIcon
            data-icon="inline-end"
            className="transition-transform group-data-popup-open:rotate-180"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-auto max-w-72">
          <DropdownMenuItem
            render={
              <Link
                to="/documents/$documentId/notes/new"
                params={{ documentId: invoice.id }}
                search={{ type: "CREDIT_NOTE" }}
              />
            }
          >
            <FileMinusIcon />
            Nota crédito
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                to="/documents/$documentId/notes/new"
                params={{ documentId: invoice.id }}
                search={{ type: "DEBIT_NOTE" }}
              />
            }
          >
            <FilePlusIcon />
            Nota débito
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={cancellationBlocked}
            aria-describedby={cancellationBlocked ? cancellationReasonId : undefined}
            onClick={() => setCancelling(true)}
          >
            <FileXIcon />
            Anular factura
          </DropdownMenuItem>
          {cancellationBlocked && (
            <div id={cancellationReasonId} className="px-1.5 py-1 text-2xs text-muted-foreground">
              Ya tiene notas crédito por parte de su valor: emite el resto con una nota crédito
              parcial.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {blockedReason && (
        <p className="max-w-64 text-2xs text-muted-foreground sm:text-right">{blockedReason}</p>
      )}
      <CancelInvoice invoice={invoice} open={cancelling} onOpenChange={setCancelling} />
    </div>
  );
}

function CorrectedInvoice({ document }: { document: DocumentDetail }) {
  const invoice = document.invoice!;
  return (
    <Section id="correction" title="Corrección">
      <dl className="grid gap-x-10 gap-y-3.25 sm:grid-cols-2 lg:grid-cols-4">
        <Entry label="Factura corregida">
          <Link
            to="/documents/$documentId"
            params={{ documentId: invoice.id }}
            className="underline underline-offset-4"
          >
            {invoice.number}
          </Link>
        </Entry>
        <Entry label="Concepto">
          {document.concept ? (conceptLabel[document.concept] ?? document.concept) : "—"}
        </Entry>
        <Entry label="Motivo">{document.description ?? "—"}</Entry>
      </dl>
    </Section>
  );
}

function InvoiceNotes({ document }: { document: DocumentDetail }) {
  // Credit notes first, then debit notes, each oldest first.
  const notes = [
    ...document.creditNotes.map((note) => ({ ...note, type: "CREDIT_NOTE" as const })),
    ...document.debitNotes.map((note) => ({ ...note, type: "DEBIT_NOTE" as const })),
  ];
  const money = (amount: number) => formatMoney(amount, document.currency);

  return (
    <Section id="notes" title="Notas asociadas">
      {notes.length === 0 ? (
        <p className="text-2xs text-muted-foreground">Esta factura no tiene notas.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-sidebar [&_th]:h-8.75">
              <TableRow>
                <TableHead className="pl-4">Nota</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-4 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="pl-4 text-2xs">
                    <Link
                      to="/documents/$documentId"
                      params={{ documentId: note.id }}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {note.number}
                    </Link>
                    <span className="ml-1.5 text-muted-foreground">
                      {documentTypeLabel[note.type]}
                    </span>
                  </TableCell>
                  <TableCell className="text-2xs">
                    {conceptLabel[note.concept] ?? note.concept}
                  </TableCell>
                  <TableCell className="text-2xs">
                    <DocumentStatusBadge status={note.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-2xs tabular-nums">
                    {note.type === "CREDIT_NOTE" ? "−" : "+"}
                    {money(note.payable)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {document.balance !== null && (
        <p className="text-2xs text-muted-foreground">
          Saldo que aún pueden acreditar las notas crédito:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {money(document.balance)}
          </span>
        </p>
      )}
    </Section>
  );
}

function DocumentNotFound() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileTextIcon />
        </EmptyMedia>
        <EmptyTitle>Documento no encontrado</EmptyTitle>
        <EmptyDescription>
          No existe o no pertenece a esta cuenta. Revisa el enlace o vuelve a tus documentos.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link to="/documents" className={cn(buttonVariants({ variant: "outline" }))}>
          Volver a los documentos
        </Link>
      </EmptyContent>
    </Empty>
  );
}
