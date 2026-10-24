import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type } from "arktype";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
import { formatMoney } from "~/features/documents/labels";
import { documentsKey } from "~/features/documents/queries";
import { issuerName } from "~/features/issuers/labels";
import { DateField, TextField } from "~/features/setup/fields";
import { FieldRow, FieldSection } from "~/features/setup/StepLayout";
import type { DocumentPreview, Environment, Issuer } from "~/lib/api/types";

import { finalConsumer, identificationTypes, paymentMeans, personTypes } from "./catalogs";
import { SelectField } from "./fields";
import { LinesEditor, emptyLine } from "./LinesEditor";
import { MunicipalityField } from "./MunicipalityField";
import { nitCheckDigit } from "./nitCheckDigit";
import {
  type InvoiceHeaderValues,
  type LinesFormValues,
  invoiceHeaderSchema,
  linesFormSchema,
  splitNit,
} from "./schema";
import { issueInvoice, previewDocument } from "./server";

const emptyCustomer: InvoiceHeaderValues["customer"] = {
  personType: "LEGAL_ENTITY",
  identificationType: "NIT",
  identificationNumber: "",
  legalName: "",
  email: "",
  responsibleForIva: false,
  departmentCode: "",
  departmentName: "",
  municipalityCode: "",
  cityName: "",
  line: "",
};

/** The first sandbox invoice comes filled in: issuing it only takes a click. */
const sampleCustomer: InvoiceHeaderValues["customer"] = {
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
} as const;

const paymentMethodItems = [
  { value: "CASH", label: "De contado" },
  { value: "CREDIT", label: "A crédito" },
];

const paymentMeansItems = paymentMeans.map((means) => ({ value: means.code, label: means.label }));

type Confirmation = { header: InvoiceHeaderValues; lines: LinesFormValues; total: DocumentPreview };

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
  /** Why the person cannot issue here, if they cannot. */
  blockedReason: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // One key while the form lives: a double click or a retry issues a single invoice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const header = useForm<InvoiceHeaderValues>({
    resolver: arktypeResolver(invoiceHeaderSchema),
    defaultValues: {
      issuerId: issuers.length === 1 || sample ? (issuers[0]?.id ?? "") : "",
      customer: sample ? sampleCustomer : emptyCustomer,
      payment: { method: "CASH", meansCode: "10", dueDate: "" },
    },
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
      ]);
      await navigate({ to: "/documents/$documentId", params: { documentId: result.id } });
    },
  });
  const failure = issue.data && !issue.data.ok ? issue.data : null;
  const method = useWatch({ control: header.control, name: "payment.method" });
  const identificationType = useWatch({
    control: header.control,
    name: "customer.identificationType",
  });
  const identificationNumber = useWatch({
    control: header.control,
    name: "customer.identificationNumber",
  });
  const nit = identificationType === "NIT" ? splitNit(identificationNumber) : null;
  const checkDigit = nit ? nitCheckDigit(nit.nit) : null;

  async function submit() {
    const [headerValid, linesValid] = await Promise.all([header.trigger(), lines.trigger()]);
    if (!headerValid || !linesValid) {
      return;
    }
    const parsedHeader = invoiceHeaderSchema(header.getValues());
    const parsedLines = linesFormSchema(lines.getValues());
    if (parsedHeader instanceof type.errors || parsedLines instanceof type.errors) {
      return;
    }
    if (environment === "LIVE") {
      const total = await previewDocument({ data: { lines: parsedLines.lines } });
      if (total) {
        setConfirmation({ header: parsedHeader, lines: parsedLines, total });
        return;
      }
    }
    issue.mutate({ data: { idempotencyKey, invoice: parsedHeader, lines: parsedLines.lines } });
  }

  function fillFinalConsumer() {
    header.setValue("customer", {
      ...emptyCustomer,
      ...finalConsumer,
    });
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
        <div>
          <Button type="button" variant="outline" size="sm" onClick={fillFinalConsumer}>
            Venta a consumidor final
          </Button>
        </div>
        <FieldRow>
          <SelectField
            control={header.control}
            name="customer.personType"
            label="Tipo de persona"
            items={personTypes}
          />
          <SelectField
            control={header.control}
            name="customer.identificationType"
            label="Documento"
            items={identificationTypes}
          />
          <TextField
            control={header.control}
            name="customer.identificationNumber"
            label="Número"
            hint={
              checkDigit === null
                ? undefined
                : `Dígito de verificación: ${checkDigit}${nit?.checkDigit ? "" : " (lo calculamos por ti)"}`
            }
            autoComplete="off"
          />
        </FieldRow>
        <FieldRow className="sm:grid-cols-2">
          <TextField
            control={header.control}
            name="customer.legalName"
            label="Nombre o razón social"
            autoComplete="off"
          />
          <TextField
            control={header.control}
            name="customer.email"
            label="Correo (opcional)"
            type="email"
            hint="Le enviamos la factura cuando la DIAN la acepte."
            autoComplete="off"
          />
        </FieldRow>
        <FieldRow className="sm:grid-cols-[1fr_1fr_auto]">
          <MunicipalityField form={header} />
          <TextField
            control={header.control}
            name="customer.line"
            label="Dirección (opcional)"
            autoComplete="off"
          />
          <Controller
            control={header.control}
            name="customer.responsibleForIva"
            render={({ field }) => (
              <Field orientation="horizontal" className="gap-2 sm:pt-7">
                <Checkbox
                  id="customer-iva"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                />
                <FieldLabel htmlFor="customer-iva" className="text-xs font-normal">
                  Responsable de IVA
                </FieldLabel>
              </Field>
            )}
          />
        </FieldRow>
      </FieldSection>

      <FieldSection title="Productos o servicios">
        <LinesEditor form={lines} currency="COP" />
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
          <AlertDescription>{failure.message}</AlertDescription>
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
                {confirmation.header.customer.legalName} ·{" "}
                {confirmation.header.customer.identificationNumber}
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
                  data: {
                    idempotencyKey,
                    invoice: confirmation.header,
                    lines: confirmation.lines.lines,
                  },
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
