import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type } from "arktype";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

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
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import { CatalogPicker } from "~/features/catalog/CatalogPicker";
import { catalogKey } from "~/features/catalog/queries";
import { customerUnavailable, toCustomerValues } from "~/features/catalog/schema";
import { useCustomerSearch } from "~/features/catalog/useCatalogSearch";
import { formatMoney } from "~/features/documents/labels";
import { documentsKey } from "~/features/documents/queries";
import { issuerName } from "~/features/issuers/labels";
import { DateField } from "~/features/setup/fields";
import { FieldRow, FieldSection } from "~/features/setup/StepLayout";
import type { DocumentPreview, Environment, Issuer } from "~/lib/api/types";

import { finalConsumer, paymentMeans } from "./catalogs";
import { CustomerFields } from "./CustomerFields";
import { CustomerSummary } from "./CustomerSummary";
import { SelectField } from "./fields";
import { LinesEditor, LinesTotals, emptyLine, useLinesPreview } from "./LinesEditor";
import {
  type CustomerValues,
  type InvoiceHeaderValues,
  type PickedCustomer,
  type LinesFormValues,
  customerFormSchema,
  emptyCustomer,
  invoiceHeaderSchema,
  linesFormSchema,
  pickedExtras,
} from "./schema";
import { issueInvoice, previewDocument } from "./server";

/** The first sandbox invoice comes filled in: issuing it only takes a click. */
const sampleCustomer: CustomerValues = {
  ...emptyCustomer,
  identificationNumber: "901234567",
  legalName: "Cliente de Ejemplo SAS",
  responsibleForIva: true,
  departmentCode: "11",
  departmentName: "Bogotá, D.C.",
  municipalityCode: "11001",
  cityName: "Bogotá, D.C.",
  line: "Calle 100 # 10-20",
};

const sampleLine = {
  description: "Asesoría contable",
  quantity: "1",
  unitPrice: "100000",
  tax: "IVA_19",
  unitCode: "94",
} as const;

const paymentMethodItems = [
  { value: "CASH", label: "De contado" },
  { value: "CREDIT", label: "A crédito" },
];

const paymentMeansItems = paymentMeans.map((means) => ({ value: means.code, label: means.label }));

type Confirmation = {
  header: InvoiceHeaderValues;
  customer: CustomerValues;
  lines: LinesFormValues;
  total: DocumentPreview;
};

export function InvoiceForm({
  environment,
  issuers,
  sample,
  blockedReason,
}: {
  environment: Environment;
  /** The issuers that can issue in the environment. */
  issuers: Issuer[];
  sample: boolean;
  /** The catalog of the environment, to fill in the customer and the lines. */
  /** Why the person cannot issue here, if they cannot. */
  blockedReason: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // One key while the form lives: a double click or a retry issues a single invoice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [saveCustomer, setSaveCustomer] = useState(false);
  const [picked, setPicked] = useState<PickedCustomer | null>(null);
  // A customer from the catalog, or the final consumer, shows in one line until edited.
  const [customerMode, setCustomerMode] = useState<"fields" | "summary">("fields");
  const customerSearch = useCustomerSearch(environment);
  const header = useForm<InvoiceHeaderValues>({
    resolver: arktypeResolver(invoiceHeaderSchema),
    defaultValues: {
      issuerId: issuers.length === 1 || sample ? (issuers[0]?.id ?? "") : "",
      payment: { method: "CASH", meansCode: "10", dueDate: "" },
    },
  });
  const customerForm = useForm<CustomerValues>({
    resolver: arktypeResolver(customerFormSchema),
    defaultValues: sample ? sampleCustomer : emptyCustomer,
  });
  const lines = useForm<LinesFormValues>({
    resolver: arktypeResolver(linesFormSchema),
    defaultValues: { lines: [sample ? sampleLine : emptyLine] },
  });
  const preview = useLinesPreview(lines);
  const issue = useMutation({
    mutationFn: issueInvoice,
    onSuccess: async (result) => {
      if (!result.ok) {
        setConfirmation(null);
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsKey }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
        queryClient.invalidateQueries({ queryKey: catalogKey }),
      ]);
      await navigate({ to: "/documents/$documentId", params: { documentId: result.id } });
    },
    // The form's alert explains the failure; the dialog would hide it.
    onError: () => setConfirmation(null),
  });
  const [previewFailure, setPreviewFailure] = useState<string | null>(null);
  // An answer of the API explains itself; a thrown error is an outage or a lost connection, and a retry
  // with the same key is safe.
  const failure =
    issue.data && !issue.data.ok
      ? issue.data.message
      : issue.error
        ? "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo."
        : previewFailure;
  const method = useWatch({ control: header.control, name: "payment.method" });
  const issuerId = useWatch({ control: header.control, name: "issuerId" });
  const issuerSelected = issuers.find((candidate) => candidate.id === issuerId);
  const [customerName, customerNumber] = useWatch({
    control: customerForm.control,
    name: ["legalName", "identificationNumber"],
  });

  async function submit() {
    const [headerValid, customerValid, linesValid] = await Promise.all([
      header.trigger(),
      customerForm.trigger(),
      lines.trigger(),
    ]);
    if (!customerValid) {
      setCustomerMode("fields");
    }
    if (!headerValid || !customerValid || !linesValid) {
      return;
    }
    const parsedHeader = invoiceHeaderSchema(header.getValues());
    const parsedCustomer = customerFormSchema(customerForm.getValues());
    const parsedLines = linesFormSchema(lines.getValues());
    if (
      parsedHeader instanceof type.errors ||
      parsedCustomer instanceof type.errors ||
      parsedLines instanceof type.errors
    ) {
      return;
    }
    setPreviewFailure(null);
    if (environment === "LIVE") {
      // A LIVE invoice is only issued from the confirmation, which needs its total.
      let total: DocumentPreview | null;
      try {
        total = await previewDocument({ data: { lines: parsedLines.lines } });
      } catch {
        setPreviewFailure(
          "No pudimos calcular el total para confirmar. Revisa tu conexión e inténtalo de nuevo.",
        );
        return;
      }
      if (!total) {
        setPreviewFailure("No pudimos calcular el total de estas líneas. Revisa sus valores.");
        return;
      }
      setConfirmation({
        header: parsedHeader,
        customer: parsedCustomer,
        lines: parsedLines,
        total,
      });
      return;
    }
    issue.mutate({ data: request(parsedHeader, parsedCustomer, parsedLines) });
  }

  function request(
    invoice: InvoiceHeaderValues,
    customer: CustomerValues,
    values: LinesFormValues,
  ) {
    return {
      idempotencyKey,
      invoice,
      customer,
      lines: values.lines,
      customerExtras: pickedExtras(picked, customer),
      saveCustomer: saveCustomer ? environment : null,
    };
  }

  function showSummary(customer: CustomerValues) {
    customerForm.reset(customer, { keepIsSubmitted: true });
    if (customerForm.formState.isSubmitted) {
      void customerForm.trigger();
    }
    setSaveCustomer(false);
    setCustomerMode("summary");
  }

  function fillFinalConsumer() {
    setPicked(null);
    showSummary({ ...emptyCustomer, ...finalConsumer });
  }

  const confirmedIssuer = confirmation
    ? issuers.find((issuer) => issuer.id === confirmation.header.issuerId)
    : undefined;

  return (
    <form
      noValidate
      className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex min-w-0 flex-col gap-8">
        {issuers.length > 1 && (
          <FieldSection title="Emisor">
            <FieldRow className="sm:grid-cols-2">
              <SelectField
                control={header.control}
                name="issuerId"
                label="Empresa que factura"
                items={issuers.map((candidate) => ({
                  value: candidate.id,
                  label: `${issuerName(candidate)} · NIT ${candidate.nit}-${candidate.checkDigit}`,
                }))}
              />
            </FieldRow>
          </FieldSection>
        )}

        <FieldSection title="Cliente">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {customerSearch.saved && (
              <div className="sm:w-80">
                <CatalogPicker
                  label="Cliente guardado"
                  placeholder="Busca por nombre o documento"
                  empty="No hay clientes con ese nombre o documento."
                  items={customerSearch.items}
                  itemLabel={(customer) =>
                    `${customer.legalName} · ${customer.identificationNumber}`
                  }
                  unavailable={customerUnavailable}
                  onSearch={customerSearch.setText}
                  onPick={(customer) => {
                    const saved = toCustomerValues(customer);
                    if (!saved) {
                      return;
                    }
                    showSummary(saved.values);
                    setPicked({
                      identificationType: saved.values.identificationType,
                      identificationNumber: saved.values.identificationNumber,
                      extras: saved.extras,
                    });
                  }}
                />
              </div>
            )}
            <Button type="button" variant="outline" size="sm" onClick={fillFinalConsumer}>
              Venta a consumidor final
            </Button>
          </div>
          {customerMode === "summary" ? (
            <CustomerSummary
              customer={customerForm.getValues()}
              onEdit={() => setCustomerMode("fields")}
            />
          ) : (
            <>
              <CustomerFields
                form={customerForm}
                emailHint="Le enviamos la factura cuando la DIAN la acepte."
              />
              <Field orientation="horizontal">
                <Checkbox
                  id="save-customer"
                  checked={saveCustomer}
                  onCheckedChange={(checked) => setSaveCustomer(checked)}
                />
                <FieldLabel htmlFor="save-customer" size="xs" className="font-normal">
                  Guardar este cliente para la próxima factura
                </FieldLabel>
              </Field>
            </>
          )}
        </FieldSection>

        <FieldSection title="Productos o servicios">
          <LinesEditor form={lines} preview={preview} currency="COP" environment={environment} />
        </FieldSection>
      </div>

      {/* Below xl the wrapper steps aside, so the footer sticks to the bottom of the whole form. */}
      <div className="max-xl:contents xl:sticky xl:top-6 xl:flex xl:flex-col xl:gap-5 xl:rounded-lg xl:border xl:p-5">
        <aside
          aria-label="Resumen de la factura"
          className="flex flex-col gap-5 max-xl:rounded-lg max-xl:border max-xl:p-4"
        >
          <dl className="grid gap-y-1.5 text-xs">
            <dt className="text-muted-foreground">Factura de</dt>
            <dd className="mb-1.5 break-words">
              {issuerSelected ? issuerName(issuerSelected) : "Sin emisor"}
            </dd>
            <dt className="text-muted-foreground">Para</dt>
            <dd className="break-words">
              {customerName ? (
                `${customerName} · ${customerNumber}`
              ) : (
                <span className="text-muted-foreground">Sin cliente</span>
              )}
            </dd>
          </dl>
          <LinesTotals preview={preview} currency="COP" className="border-t pt-4" />
          <div className="flex flex-col gap-4 border-t pt-4">
            <SelectField
              control={header.control}
              name="payment.method"
              label="Forma de pago"
              items={paymentMethodItems}
            />
            <SelectField
              control={header.control}
              name="payment.meansCode"
              label="Medio de pago"
              items={paymentMeansItems}
            />
            {method === "CREDIT" && (
              <DateField control={header.control} name="payment.dueDate" label="Vence el" />
            )}
          </div>
          {failure && (
            <Alert variant="destructive">
              <AlertTitle>No se emitió la factura</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          {blockedReason && (
            <Alert>
              <AlertDescription>{blockedReason}</AlertDescription>
            </Alert>
          )}
        </aside>

        <div className="flex items-center justify-between gap-4 max-xl:sticky max-xl:bottom-0 max-xl:-mx-4 max-xl:border-t max-xl:bg-background max-xl:px-4 max-xl:py-3 md:max-xl:-mx-10 md:max-xl:px-10">
          <p className="flex flex-col text-xs xl:hidden">
            <span className="text-muted-foreground">Total</span>
            <span className="text-base font-medium tabular-nums">
              {preview.totals ? formatMoney(preview.totals.totals.payable, "COP") : "—"}
            </span>
          </p>
          <Button
            type="submit"
            className="xl:w-full"
            disabled={issue.isPending || Boolean(blockedReason)}
          >
            {issue.isPending && <Spinner data-icon="inline-start" />}
            Emitir factura
          </Button>
        </div>
      </div>
      <AlertDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmation(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Emitir esta factura en producción?</AlertDialogTitle>
            <AlertDialogDescription>
              Se envía a la DIAN con validez fiscal. Una vez aceptada, solo se corrige con una nota
              crédito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {confirmation && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <dt className="text-muted-foreground">Emisor</dt>
              <dd>{confirmedIssuer ? issuerName(confirmedIssuer) : ""}</dd>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd>
                {confirmation.customer.legalName} · {confirmation.customer.identificationNumber}
              </dd>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(confirmation.total.totals.payable, "COP")}
              </dd>
            </dl>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={issue.isPending}>Revisar</AlertDialogCancel>
            <Button
              disabled={issue.isPending}
              onClick={() =>
                confirmation &&
                issue.mutate({
                  data: request(confirmation.header, confirmation.customer, confirmation.lines),
                })
              }
            >
              {issue.isPending && <Spinner data-icon="inline-start" />}
              Emitir en producción
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
