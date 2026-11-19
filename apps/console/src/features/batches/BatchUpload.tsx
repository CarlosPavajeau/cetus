import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, FileSpreadsheetIcon, UploadIcon } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button, buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { auditLogKey } from "~/features/audit-log/queries";
import { formatMoney } from "~/features/documents/labels";
import { documentsKey } from "~/features/documents/queries";
import { environmentLabel } from "~/features/environment/EnvironmentSelect";
import { issuerName, issuerNit } from "~/features/issuers/labels";
import type { BatchItem, BatchLine, Environment, Issuer } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { templatePath } from "./columns";
import { locate, type ParsedInvoice, type RowError } from "./parse";
import { readBatchFile, type ReadFile } from "./readBatchFile";
import { findSameFile, sendBatch } from "./server";

/** Answers that leave the body unprocessed: the retry they ask for keeps its key, or the first request could land twice. */
const codesRetryable = new Set(["idempotency_in_progress", "rate_limited"]);

/** The table shows this many errors; the count tells how many more there are. */
const errorsShownMax = 200;

/**
 * Upload of a filled-in template: the file is read in the browser, every error shows with its row and column,
 * and the invoices go to the API only once the person confirms. Nothing is numbered until the API accepts all.
 */
export function BatchUpload({
  environment,
  issuers,
  blockedReason,
  onSent,
}: {
  environment: Environment;
  /** The issuers that can issue in the environment. */
  issuers: Issuer[];
  blockedReason: string | null;
  onSent: (batchId: string) => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const issuerFieldId = useId();
  const input = useRef<HTMLInputElement>(null);
  // Each file or issuer chosen supersedes the previous one: a read or a check that finishes late must not replace it.
  const selection = useRef(0);
  const sameFileCheck = useRef(0);
  const [issuerId, setIssuerId] = useState(issuers.length === 1 ? (issuers[0]?.id ?? "") : "");
  const [reading, setReading] = useState(false);
  const [file, setFile] = useState<ReadFile | null>(null);
  // Errors the API found, by reference, merged with the file's so the same choice excludes them.
  const [errorsApi, setErrorsApi] = useState<Map<string, RowError[]>>(new Map());
  const [excludeInvalid, setExcludeInvalid] = useState(false);
  const [sameFile, setSameFile] = useState<{ createdAt: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  // One key per request body until the API answers: a retry after a lost answer gets the same batch back, and a
  // different body (another file, issuer or choice of invoices) gets a key of its own.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const send = useMutation({
    mutationFn: sendBatch,
    onSuccess: async (result, variables) => {
      setConfirming(false);
      if (!result.ok && codesRetryable.has(result.code)) {
        return;
      }
      setIdempotencyKey(crypto.randomUUID());
      if (!result.ok) {
        const sent = invoicesOf(file).filter((invoice) =>
          variables.data.items.some((item) => item.reference === invoice.reference),
        );
        const byReference = new Map<string, RowError[]>();
        for (const error of result.errors) {
          const reference = sent[error.index]?.reference ?? "";
          byReference.set(reference, [...(byReference.get(reference) ?? []), locate(error, sent)]);
        }
        setErrorsApi(byReference);
        setExcludeInvalid(false);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsKey }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
      ]);
      await onSent(result.id);
    },
    onError: () => setConfirming(false),
  });

  const invoices = invoicesOf(file);
  const errorsOf = (invoice: ParsedInvoice) => [
    ...invoice.errors,
    ...(errorsApi.get(invoice.reference) ?? []),
  ];
  const valid = invoices.filter(
    (invoice) => invoice.item !== null && errorsOf(invoice).length === 0,
  );
  const invalid = invoices.filter(
    (invoice) => invoice.item === null || errorsOf(invoice).length > 0,
  );
  const errors = invalid.flatMap(errorsOf).toSorted((a, b) => a.row - b.row);
  const items = valid.flatMap((invoice) => (invoice.item === null ? [] : [invoice.item]));
  const sendable = items.length > 0 && (invalid.length === 0 || excludeInvalid);
  const failure =
    send.data && !send.data.ok && send.data.errors.length === 0
      ? send.data.message
      : send.error
        ? "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo: el lote no se duplica."
        : null;

  async function choose(chosen: File | undefined) {
    if (!chosen || send.isPending) {
      return;
    }
    selection.current += 1;
    const current = selection.current;
    sameFileCheck.current += 1;
    setReading(true);
    setFile(null);
    setErrorsApi(new Map());
    setExcludeInvalid(false);
    setSameFile(null);
    send.reset();
    setIdempotencyKey(crypto.randomUUID());
    try {
      const read = await readBatchFile(chosen);
      if (current !== selection.current) {
        return;
      }
      setFile(read);
      if (read.ok && issuerId) {
        await warnSameFile(issuerId, read.sha256);
      }
    } catch {
      if (current !== selection.current) {
        return;
      }
      setFile({
        ok: false,
        message: "No pudimos leer el archivo. Revisa que sea la plantilla en .xlsx o un .csv.",
        fileName: chosen.name,
      });
    } finally {
      if (current === selection.current) {
        setReading(false);
      }
    }
  }

  async function warnSameFile(issuer: string, sha256: string) {
    sameFileCheck.current += 1;
    const current = sameFileCheck.current;
    try {
      const found = await findSameFile({ data: { issuerId: issuer, fileSha256: sha256 } });
      if (current === sameFileCheck.current) {
        setSameFile(found.batch ? { createdAt: found.batch.createdAt } : null);
      }
    } catch {
      if (current === sameFileCheck.current) {
        setSameFile(null);
      }
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      {blockedReason && (
        <Alert variant="destructive">
          <AlertTitle>No puedes emitir en este ambiente</AlertTitle>
          <AlertDescription>{blockedReason}</AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">1. Llena la plantilla</h2>
        <p className="text-sm text-muted-foreground">
          Una fila por cada línea de factura; las filas con la misma referencia forman una factura.
          Si el cliente o el producto ya están guardados, basta con su identificación o su código.
          También puedes exportar un CSV con las mismas columnas desde otro sistema.
        </p>
        <div>
          <a href={templatePath} download className={cn(buttonVariants({ variant: "outline" }))}>
            <DownloadIcon aria-hidden />
            Descargar la plantilla (.xlsx)
          </a>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">2. Elige el emisor y sube el archivo</h2>
        {issuers.length > 1 && (
          <Field size="xs" className="sm:max-w-md">
            <FieldLabel htmlFor={issuerFieldId}>Empresa que factura</FieldLabel>
            <Select
              items={issuers.map((issuer) => ({ value: issuer.id, label: issuerLabel(issuer) }))}
              value={issuerId}
              onValueChange={(value) => {
                const next = typeof value === "string" ? value : "";
                setIssuerId(next);
                setIdempotencyKey(crypto.randomUUID());
                if (file?.ok && next) {
                  void warnSameFile(next, file.sha256);
                }
              }}
            >
              <SelectTrigger id={issuerFieldId} className="w-full">
                <SelectValue placeholder="Elige el emisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {issuers.map((issuer) => (
                    <SelectItem key={issuer.id} value={issuer.id}>
                      {issuerLabel(issuer)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (!reading) {
              void choose(event.dataTransfer.files[0]);
            }
          }}
          className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-sidebar p-6 text-center"
        >
          {reading ? (
            <Spinner aria-label="Leyendo el archivo" />
          ) : file ? (
            <FileSpreadsheetIcon className="size-6.5 text-primary" aria-hidden />
          ) : (
            <UploadIcon className="size-6.5 text-muted-foreground" aria-hidden />
          )}
          <p className="text-sm break-all">
            {reading
              ? "Leyendo el archivo…"
              : file
                ? file.fileName
                : "Arrastra aquí la plantilla (.xlsx) o un .csv, de hasta 5 MB"}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={reading || send.isPending}
            onClick={() => input.current?.click()}
          >
            {file ? "Elegir otro archivo" : "Seleccionar archivo"}
          </Button>
          <input
            ref={input}
            type="file"
            aria-label="Archivo de facturas"
            accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              void choose(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
        {file && !file.ok && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos usar este archivo</AlertTitle>
            <AlertDescription>{file.message}</AlertDescription>
          </Alert>
        )}
        {sameFile && (
          <Alert>
            <AlertTitle>Ya subiste este archivo</AlertTitle>
            <AlertDescription>
              Enviaste un lote con este mismo archivo el{" "}
              {new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeStyle: "short" }).format(
                new Date(sameFile.createdAt),
              )}
              . Si lo envías de nuevo, sus facturas se emiten otra vez.
            </AlertDescription>
          </Alert>
        )}
      </section>

      {file?.ok && (
        <section className="flex flex-col gap-4" aria-labelledby="batch-review">
          <h2 id="batch-review" className="text-lg font-medium">
            3. Revisa y emite
          </h2>
          <Summary invoices={valid} rowCount={file.rowCount} />
          {invalid.length > 0 && (
            <>
              <Alert variant="destructive">
                <AlertTitle>
                  {invalid.length === 1
                    ? "1 factura tiene errores"
                    : `${invalid.length} facturas tienen errores`}
                </AlertTitle>
                <AlertDescription>
                  Corrige el archivo y súbelo de nuevo, o emite solo las facturas sin errores.
                </AlertDescription>
              </Alert>
              <ErrorTable errors={errors} />
              {valid.length > 0 && (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={excludeInvalid}
                    onCheckedChange={(checked) => {
                      setExcludeInvalid(checked);
                      setIdempotencyKey(crypto.randomUUID());
                    }}
                  />
                  Excluir las {invalid.length} facturas con errores y emitir las otras{" "}
                  {valid.length}
                </label>
              )}
            </>
          )}
          {failure && (
            <Alert variant="destructive">
              <AlertTitle>No pudimos recibir el lote</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          <div>
            <Button
              type="button"
              disabled={!sendable || !issuerId || blockedReason !== null || send.isPending}
              onClick={() => setConfirming(true)}
            >
              {items.length === 1 ? "Emitir 1 factura" : `Emitir ${items.length} facturas`}
            </Button>
          </div>
        </section>
      )}

      <AlertDialog
        open={confirming}
        onOpenChange={(open) => !send.isPending && setConfirming(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Emitir {items.length === 1 ? "1 factura" : `${items.length} facturas`} en{" "}
              {environmentLabel[environment].toLowerCase()}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {environment === "LIVE"
                ? "Son facturas reales: van a la DIAN con validez fiscal y les llegan a tus clientes por correo. Solo se corrigen con notas crédito."
                : "Se numeran y se procesan en segundo plano. Te enviamos un correo cuando el lote termine."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={send.isPending}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              disabled={send.isPending || !file?.ok}
              onClick={() => {
                if (!file?.ok) {
                  return;
                }
                send.mutate({
                  data: {
                    idempotencyKey,
                    issuerId,
                    fileName: file.fileName.slice(0, 255),
                    fileSha256: file.sha256,
                    items,
                  },
                });
              }}
            >
              {send.isPending && <Spinner />}
              Emitir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function invoicesOf(file: ReadFile | null): ParsedInvoice[] {
  return file?.ok ? file.invoices : [];
}

function issuerLabel(issuer: Issuer) {
  return `${issuerName(issuer)} · NIT ${issuerNit(issuer)}`;
}

/**
 * What the batch issues, as far as the file tells: the API completes a line from its saved product and a customer
 * from its saved one, so those count only once it resolves them.
 */
function Summary({ invoices, rowCount }: { invoices: ParsedInvoice[]; rowCount: number }) {
  const items = invoices.flatMap((invoice) => (invoice.item ? [invoice.item] : []));
  const total = items.reduce((sum, item) => sum + itemTotal(item), 0);
  const fromCatalog = items.some((item) => item.lines.some(completedByCatalog));
  const emails = items.filter((item) => item.customer.email).length;
  const emailsUnknown = items.length > emails;
  return (
    <dl className="grid gap-4 rounded-md border p-4 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-muted-foreground">Facturas listas</dt>
        <dd className="text-lg tabular-nums">{items.length}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Filas leídas</dt>
        <dd className="text-lg tabular-nums">{rowCount}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Total con impuestos</dt>
        <dd className="text-lg tabular-nums">
          {formatMoney(total, "COP")}
          {fromCatalog && (
            <span className="block text-xs text-muted-foreground">
              sin lo que completa el catálogo
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Correos al cliente</dt>
        <dd className="text-lg tabular-nums">
          {emails}
          {emailsUnknown && (
            <span className="block text-xs text-muted-foreground">
              sin los de clientes guardados
            </span>
          )}
        </dd>
      </div>
    </dl>
  );
}

function completedByCatalog(line: BatchLine) {
  return (
    line.unitPrice === undefined || (line.productCode !== undefined && line.taxes === undefined)
  );
}

function itemTotal(item: BatchItem) {
  return item.lines.reduce((sum, line) => {
    if (line.unitPrice === undefined) {
      return sum;
    }
    const base = line.quantity * line.unitPrice;
    const rate = (line.taxes ?? []).reduce((acc, tax) => acc + tax.percent, 0);
    return sum + base * (1 + rate / 100);
  }, 0);
}

function ErrorTable({ errors }: { errors: RowError[] }) {
  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Fila</TableHead>
            <TableHead className="w-56">Columna</TableHead>
            <TableHead>Qué corregir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errors.slice(0, errorsShownMax).map((error) => (
            <TableRow key={`${error.row}-${error.column ?? ""}-${error.message}`}>
              <TableCell className="tabular-nums">{error.row || "—"}</TableCell>
              <TableCell>{error.column ?? "Toda la factura"}</TableCell>
              <TableCell className="whitespace-normal">{error.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {errors.length > errorsShownMax && (
        <p className="text-sm text-muted-foreground">
          Y {errors.length - errorsShownMax} errores más. Corrige estos y vuelve a subir el archivo.
        </p>
      )}
    </div>
  );
}
