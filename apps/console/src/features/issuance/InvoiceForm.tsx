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
import { SelectField } from "./fields";
import { LinesEditor, emptyLine } from "./LinesEditor";
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

  async function submit() {
    const [headerValid, customerValid, linesValid] = await Promise.all([
      header.trigger(),
      customerForm.trigger(),
      lines.trigger(),
    ]);
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

  function fillFinalConsumer() {
    setPicked(null);
    customerForm.reset({ ...emptyCustomer, ...finalConsumer });
  }

  const confirmedIssuer = confirmation
    ? issuers.find((issuer) => issuer.id === confirmation.header.issuerId)
    : undefined;

  return (
    <form
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FieldSection title="Emisor">
        <FieldRow className="sm:grid-cols-2">
          <SelectField
            control={header.control}
            name="issuerId"
            label="Empresa que factura"
            items={issuers.map((issuer) => ({
              value: issuer.id,
              label: `${issuerName(issuer)} · NIT ${issuer.nit}-${issuer.checkDigit}`,
            }))}
          />
        </FieldRow>
      </FieldSection>

      <FieldSection title="Cliente">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {customerSearch.saved && (
            <div className="sm:w-80">
              <CatalogPicker
                label="Cliente guardado"
                placeholder="Busca por nombre o documento"
                empty="No hay clientes con ese nombre o documento."
                items={customerSearch.items}
                itemLabel={(customer) => `${customer.legalName} · ${customer.identificationNumber}`}
                unavailable={customerUnavailable}
                onSearch={customerSearch.setText}
                onPick={(customer) => {
                  const saved = toCustomerValues(customer);
                  if (!saved) {
                    return;
                  }
                  customerForm.reset(saved.values, { keepIsSubmitted: true });
                  if (customerForm.formState.isSubmitted) {
                    void customerForm.trigger();
                  }
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
        <CustomerFields
          form={customerForm}
          emailHint="Le enviamos la factura cuando la DIAN la acepte."
        />
      </FieldSection>

      <Field orientation="horizontal" className="-mt-4 gap-2">
        <Checkbox
          id="save-customer"
          checked={saveCustomer}
          onCheckedChange={(checked) => setSaveCustomer(checked)}
        />
        <FieldLabel htmlFor="save-customer" className="text-xs font-normal">
          Guardar este cliente para la próxima factura
        </FieldLabel>
      </Field>

      <FieldSection title="Productos o servicios">
        <LinesEditor form={lines} currency="COP" environment={environment} />
      </FieldSection>

      <FieldSection title="Pago">
        <FieldRow>
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
        </FieldRow>
      </FieldSection>

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

      <div className="flex justify-end">
        <Button type="submit" disabled={issue.isPending || Boolean(blockedReason)}>
          {issue.isPending && <Spinner data-icon="inline-start" />}
          Emitir factura
        </Button>
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
