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
  RotateCcwIcon,
} from "lucide-react";
import { useId, useState } from "react";

import { CopyButton } from "~/components/CopyButton";
import { Entry, RuledEntry, Section } from "~/components/DetailSection";
import { EnvironmentBadge, environmentLabel } from "~/components/EnvironmentBadge";
import { PageHeader } from "~/components/PageHeader";
import { Badge } from "~/components/ui/badge";
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
  describeDeliveryError,
  describeEvent,
  documentLead,
  documentTypeLabel,
  formatDay,
  formatMoney,
  identificationTypeLabel,
  isTechnicalEvent,
} from "~/features/documents/labels";
import { documentDetailQuery } from "~/features/documents/queries";
import { ResendDocument } from "~/features/documents/ResendDocument";
import { getDocumentFileUrl } from "~/features/documents/server";
import { paymentMeans, paymentMethods } from "~/features/issuance/catalogs";
import { reissueTarget } from "~/features/issuance/reissue";
import { useBlockedReason } from "~/features/issuance/useBlockedReason";
import type { DocumentDetail } from "~/lib/api/types";
import { cn, uuidPattern } from "~/lib/utils";

export const Route = createFileRoute("/_app/documents/$documentId")({
  loader: async ({ context: { queryClient }, params }) => {
    if (!uuidPattern.test(params.documentId)) {
      throw notFound();
    }
    const document = await queryClient.query({
      ...documentDetailQuery(params.documentId),
      staleTime: "static",
    });
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
  const document = useSuspenseQuery(documentDetailQuery(documentId)).data;
  if (!document) {
    throw notFound();
  }
  const money = (amount: number) => formatMoney(amount, document.currency);
  const isInvoice = document.documentType === "INVOICE";
  const sandbox = document.environment === "SANDBOX";
  const unsent = document.status === "REJECTED" || document.status === "FAILED";

  return (
    <div className="flex flex-1 flex-col gap-5">
      <BackToDocuments />

      <PageHeader
        title={`${documentTypeLabel[document.documentType]} ${document.number}`}
        status={<DocumentStatusBadge status={document.status} environment={document.environment} />}
        summary={<DocumentSummary document={document} />}
        lead={documentLead(document.status, document.environment)}
        action={
          <div className="flex flex-wrap items-start gap-2">
            {isInvoice && document.status === "ACCEPTED" && (
              <InvoiceCorrections invoice={document} />
            )}
            <ReissueAction document={document} />
            <DocumentDownloads
              getUrl={(file) => getDocumentFileUrl({ data: { id: document.id, file } })}
            />
          </div>
        }
      />

      <DianErrors document={document} />

      <section
        className="flex min-h-16 flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-card px-5 py-3 sm:items-center"
        aria-label={isInvoice ? "CUFE" : "CUDE"}
      >
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <FingerprintIcon className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden="true" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-2xs text-muted-foreground">{isInvoice ? "CUFE" : "CUDE"}</span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <code className="min-w-0 text-sm break-all sm:truncate" data-testid="document-cufe">
                {document.cufe ?? "Se calcula al firmar el documento"}
              </code>
              <EnvironmentBadge environment={document.environment} />
              {document.cufe && unsent && <Badge variant="destructive">Sin validez</Badge>}
            </div>
          </div>
        </div>
        {document.cufe && (
          <CopyButton value={document.cufe} label={`Copiar ${isInvoice ? "CUFE" : "CUDE"}`} />
        )}
      </section>

      {!isInvoice && document.invoice && (
        <CorrectedInvoice document={document} invoice={document.invoice} />
      )}

      <Section id="document-data" title="Datos">
        <dl className="flex flex-col divide-y">
          <RuledEntry label="Emisor">
            <Link
              to="/issuers/$issuerId"
              params={{ issuerId: document.issuer.id }}
              className="w-fit underline-offset-4 hover:underline"
            >
              {document.issuer.legalName}
            </Link>
            <CopyableId
              prefix="NIT"
              value={withCheckDigit(document.issuer.nit, document.issuer.checkDigit)}
              label="Copiar NIT del emisor"
            />
          </RuledEntry>
          <RuledEntry label="Cliente">
            <span>{document.customer.legalName}</span>
            <CopyableId
              prefix={
                identificationTypeLabel[document.customer.identificationType] ??
                document.customer.identificationType
              }
              value={withCheckDigit(
                document.customer.identificationNumber,
                document.customer.checkDigit,
              )}
              label="Copiar identificación del cliente"
            />
            <span className="text-muted-foreground">{document.customer.email ?? "Sin correo"}</span>
          </RuledEntry>
          <RuledEntry label="Fecha de emisión">{formatDay(document.issueDate)}</RuledEntry>
          {document.dueDate && (
            <RuledEntry label="Vencimiento">{formatDay(document.dueDate)}</RuledEntry>
          )}
          {document.payment && (
            <RuledEntry label="Pago">{paymentLabel(document.payment)}</RuledEntry>
          )}
          <RuledEntry label="Referencia externa">{document.externalReference ?? "—"}</RuledEntry>
        </dl>
      </Section>

      <Section id="lines" title="Detalle">
        <div className="-mx-5 -mb-5 overflow-hidden rounded-b-lg">
          <Table>
            <TableHeader className="[&_th]:h-8.75">
              <TableRow>
                <TableHead className="pl-5">Descripción</TableHead>
                <TableHead className="text-right max-sm:p-0">
                  <span className="max-sm:sr-only">Cantidad</span>
                </TableHead>
                <TableHead className="text-right max-sm:p-0">
                  <span className="max-sm:sr-only">Precio unitario</span>
                </TableHead>
                <TableHead className="pr-5 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {document.lines.map((line) => (
                <TableRow key={line.lineNumber}>
                  <TableCell className="pl-5 text-sm whitespace-normal">
                    {line.description}
                    {line.itemCode && (
                      <span className="text-muted-foreground"> · {line.itemCode}</span>
                    )}
                    {/* Screen readers get the quantity and price from their own cells. */}
                    <span
                      className="block text-muted-foreground tabular-nums sm:hidden"
                      aria-hidden="true"
                    >
                      {quantityFormat.format(line.quantity)} × {money(line.unitPrice)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums max-sm:p-0">
                    <span className="max-sm:sr-only">{quantityFormat.format(line.quantity)}</span>
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums max-sm:p-0">
                    <span className="max-sm:sr-only">{money(line.unitPrice)}</span>
                  </TableCell>
                  <TableCell className="pr-5 text-right text-sm tabular-nums">
                    {money(line.lineExtension)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter className="text-sm">
              <TableRow>
                <TableCell colSpan={3} className="pl-5 text-right">
                  Subtotal
                </TableCell>
                <TableCell className="pr-5 text-right tabular-nums">
                  {money(document.totals.lineExtension)}
                </TableCell>
              </TableRow>
              {document.taxes.map((tax) => (
                <TableRow key={`${tax.type}-${tax.percent}`}>
                  <TableCell colSpan={3} className="pl-5 text-right whitespace-normal">
                    {tax.type} {percentFormat.format(tax.percent)} % sobre {money(tax.taxable)}
                  </TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">
                    {money(tax.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="pl-5 text-right text-md font-medium">
                  Total
                </TableCell>
                <TableCell className="pr-5 text-right text-md font-medium tabular-nums">
                  {money(document.totals.payable)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </Section>

      {isInvoice && (document.status === "ACCEPTED" || hasNotes(document)) && (
        <InvoiceNotes document={document} />
      )}

      {(document.deliveries.length > 0 || !unsent) && (
        <Section
          id="deliveries"
          title="Entrega al cliente"
          action={<ResendDocument document={document} />}
        >
          {document.deliveries.length === 0 ? (
            <p className="text-2xs text-muted-foreground">
              {document.status === "ACCEPTED"
                ? "Cetus está preparando el correo con el PDF y el AttachedDocument."
                : sandbox
                  ? "Cuando el simulador lo acepte, Cetus lo envía por correo al contacto técnico de la cuenta, nunca al cliente."
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
                  {delivery.error && (
                    <span className="text-muted-foreground">
                      {describeDeliveryError(delivery.error)}
                    </span>
                  )}
                  {!sandbox &&
                    ["SKIPPED", "BOUNCED", "COMPLAINED", "FAILED"].includes(delivery.status) && (
                      <span className="text-muted-foreground">
                        El cliente no lo recibió por correo: entrégale el PDF y el AttachedDocument
                        por tu cuenta.
                      </span>
                    )}
                </li>
              ))}
            </ul>
          )}
          {sandbox && document.deliveries.length > 0 && (
            <p className="text-2xs text-muted-foreground">
              En sandbox el correo va al contacto técnico de la cuenta, nunca al cliente.
            </p>
          )}
        </Section>
      )}

      <DocumentTimeline document={document} />
    </div>
  );
}

function DocumentTimeline({ document }: { document: DocumentDetail }) {
  const [technicalShown, setTechnicalShown] = useState(false);
  const technicalCount = document.events.filter(isTechnicalEvent).length;
  const events = technicalShown
    ? document.events
    : document.events.filter((event) => !isTechnicalEvent(event));

  return (
    <Section
      id="timeline"
      title="Historial"
      action={
        technicalCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            aria-pressed={technicalShown}
            onClick={() => setTechnicalShown(!technicalShown)}
          >
            {technicalShown
              ? "Ocultar eventos técnicos"
              : `Mostrar eventos técnicos (${technicalCount})`}
          </Button>
        )
      }
    >
      <ol className="flex flex-col gap-3 border-l pl-4">
        {events.map((event) => {
          const { title, detail } = describeEvent(event, document.environment);
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
  );
}

function DocumentSummary({ document }: { document: DocumentDetail }) {
  const facts = [
    `${document.issuer.legalName}, NIT ${withCheckDigit(document.issuer.nit, document.issuer.checkDigit)}`,
    document.customer.legalName,
    formatMoney(document.totals.payable, document.currency),
    environmentLabel(document.environment),
  ];
  return (
    <p className="text-sm text-muted-foreground" data-testid="document-summary">
      {facts.map((fact, index) => (
        <span key={fact}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          <span className={cn(index === 2 && "text-foreground tabular-nums")}>{fact}</span>
        </span>
      ))}
    </p>
  );
}

function paymentLabel(payment: NonNullable<DocumentDetail["payment"]>) {
  const method =
    paymentMethods.find((option) => option.value === payment.method)?.label ?? payment.method;
  const means =
    paymentMeans.find((option) => option.code === payment.meansCode)?.label ??
    `Medio ${payment.meansCode}`;
  return `${method} · ${means}`;
}

function hasNotes(invoice: DocumentDetail) {
  return invoice.creditNotes.length > 0 || invoice.debitNotes.length > 0;
}

function withCheckDigit(number: string, checkDigit: string | null) {
  return checkDigit ? `${number}-${checkDigit}` : number;
}

/** An identification number to paste elsewhere, after an optional type such as "CC". */
function CopyableId({ prefix, value, label }: { prefix?: string; value: string; label: string }) {
  return (
    <span className="-my-1 flex items-center gap-1.5">
      {prefix && <span>{prefix}</span>}
      <code className="min-w-0 text-sm break-all">{value}</code>
      <CopyButton value={value} label={label} iconOnly />
    </span>
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

/**
 * Opens the form of a rejected or failed document filled with its data. The copy is issued in the
 * document's environment, so in LIVE it follows who may issue there.
 */
function ReissueAction({ document }: { document: DocumentDetail }) {
  const blockedReason = useBlockedReason(document.environment);
  const target = reissueTarget(document);
  if (!target) {
    return null;
  }
  const label = (
    <>
      <RotateCcwIcon data-icon="inline-start" />
      Emitir de nuevo
    </>
  );

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {blockedReason ? (
        <Button disabled>{label}</Button>
      ) : target.kind === "invoice" ? (
        <Link to="/documents/new" search={{ from: target.from }} className={cn(buttonVariants())}>
          {label}
        </Link>
      ) : (
        <Link
          to="/documents/$documentId/notes/new"
          params={{ documentId: target.invoiceId }}
          search={{ type: target.type, from: target.from }}
          className={cn(buttonVariants())}
        >
          {label}
        </Link>
      )}
      {blockedReason && (
        <p className="max-w-64 text-2xs text-muted-foreground sm:text-right">{blockedReason}</p>
      )}
    </div>
  );
}

function CorrectedInvoice({
  document,
  invoice,
}: {
  document: DocumentDetail;
  invoice: NonNullable<DocumentDetail["invoice"]>;
}) {
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
        <div className="-mx-5">
          <Table>
            <TableHeader className="[&_th]:h-8.75">
              <TableRow>
                <TableHead className="pl-5">Nota</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="pr-5 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((note) => (
                <TableRow key={note.id}>
                  <TableCell className="pl-5 text-sm">
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
                  <TableCell className="text-sm">
                    {conceptLabel[note.concept] ?? note.concept}
                  </TableCell>
                  <TableCell className="text-sm">
                    <DocumentStatusBadge status={note.status} environment={document.environment} />
                  </TableCell>
                  <TableCell className="pr-5 text-right text-sm tabular-nums">
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
    <Empty>
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
