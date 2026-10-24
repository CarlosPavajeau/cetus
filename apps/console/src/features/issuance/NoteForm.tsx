import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type } from "arktype";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { auditLogKey } from "~/features/audit-log/queries";
import { conceptLabel, formatMoney } from "~/features/documents/labels";
import { documentsKey } from "~/features/documents/queries";
import { FieldRow, FieldSection } from "~/features/setup/StepLayout";
import type {
  CreditNoteConcept,
  DebitNoteConcept,
  DocumentDetail,
  DocumentPreview,
} from "~/lib/api/types";

import { SelectField } from "./fields";
import { LinesEditor, emptyLine } from "./LinesEditor";
import { type LinesFormValues, linesFormSchema } from "./schema";
import {
  type IssueResult,
  type NoteHeaderValues,
  creditNoteSchema,
  debitNoteSchema,
  issueCreditNote,
  issueDebitNote,
  noteHeaderSchema,
  previewDocument,
} from "./server";

export type NoteType = "CREDIT_NOTE" | "DEBIT_NOTE";

// A full cancellation has its own dialog on the invoice, which credits every line at once.
const creditConcepts = [
  "PARTIAL_RETURN",
  "REBATE",
  "PRICE_ADJUSTMENT",
  "EARLY_PAYMENT_DISCOUNT",
  "VOLUME_DISCOUNT",
] as const satisfies readonly CreditNoteConcept[];

const debitConcepts = [
  "INTEREST",
  "EXPENSES",
  "VALUE_CHANGE",
  "OTHER",
] as const satisfies readonly DebitNoteConcept[];

const copy = {
  CREDIT_NOTE: {
    title: "nota crédito",
    lines: "Lo que se acredita",
    linesHint: "Los productos o servicios que se devuelven o el valor que se descuenta.",
  },
  DEBIT_NOTE: {
    title: "nota débito",
    lines: "Lo que se cobra",
    linesHint: "Los intereses, gastos o valores que se suman a la factura.",
  },
};

type NoteValues = NoteHeaderValues & LinesFormValues;

type Confirmation = { note: NoteValues; total: number };

/**
 * A credit or debit note against an accepted invoice: the customer and payment come from the invoice, so
 * only the concept, the reason and the lines are asked for.
 */
export function NoteForm({
  invoice,
  noteType,
  blockedReason,
}: {
  invoice: DocumentDetail;
  noteType: NoteType;
  blockedReason: string | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const descriptionId = useId();
  // One key while the form lives: a double click or a retry issues a single note.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const concepts = noteType === "CREDIT_NOTE" ? creditConcepts : debitConcepts;
  const header = useForm<NoteHeaderValues>({
    resolver: arktypeResolver(noteHeaderSchema),
    defaultValues: { concept: concepts[0], description: "" },
  });
  const lines = useForm<LinesFormValues>({
    resolver: arktypeResolver(linesFormSchema),
    defaultValues: { lines: [emptyLine] },
  });
  const issue = useMutation({
    mutationFn: async (note: NoteValues): Promise<IssueResult> => {
      if (noteType === "CREDIT_NOTE") {
        const parsed = creditNoteSchema(note);
        if (parsed instanceof type.errors) {
          return { ok: false, code: "invalid_request", message: parsed.summary };
        }
        return issueCreditNote({ data: { invoiceId: invoice.id, idempotencyKey, note: parsed } });
      }
      const parsed = debitNoteSchema(note);
      if (parsed instanceof type.errors) {
        return { ok: false, code: "invalid_request", message: parsed.summary };
      }
      return issueDebitNote({ data: { invoiceId: invoice.id, idempotencyKey, note: parsed } });
    },
    onSuccess: async (result) => {
      setConfirmation(null);
      if (!result.ok) {
        return;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentsKey }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
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
  const money = (amount: number) => formatMoney(amount, invoice.currency);

  async function submit() {
    const [headerValid, linesValid] = await Promise.all([header.trigger(), lines.trigger()]);
    if (!headerValid || !linesValid) {
      return;
    }
    setPreviewFailure(null);
    // What is previewed and confirmed is what is issued, even if the form changes meanwhile.
    const note: NoteValues = { ...header.getValues(), lines: lines.getValues().lines };
    if (invoice.environment === "LIVE") {
      // A LIVE note is only issued from the confirmation, which needs its total.
      let preview: DocumentPreview | null;
      try {
        preview = await previewDocument({ data: { lines: note.lines } });
      } catch {
        setPreviewFailure(
          "No pudimos calcular el total para confirmar. Revisa tu conexión e inténtalo de nuevo.",
        );
        return;
      }
      if (!preview) {
        setPreviewFailure("No pudimos calcular el total de estas líneas. Revisa sus valores.");
        return;
      }
      setConfirmation({ note, total: preview.totals.payable });
      return;
    }
    issue.mutate(note);
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <FieldSection title="Motivo">
        <FieldRow className="sm:grid-cols-2">
          <SelectField
            control={header.control}
            name="concept"
            label="Concepto"
            items={concepts.map((concept) => ({
              value: concept,
              label: conceptLabel[concept] ?? concept,
            }))}
          />
        </FieldRow>
        <Controller
          control={header.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-1.75">
              <FieldLabel htmlFor={descriptionId} className="text-xs">
                Descripción
              </FieldLabel>
              <Textarea
                {...field}
                id={descriptionId}
                maxLength={500}
                placeholder="Por ejemplo: el cliente devolvió dos unidades"
                aria-invalid={fieldState.invalid}
              />
              {!fieldState.invalid && (
                <FieldDescription className="text-[10px]">
                  Queda en la nota como el motivo de la corrección.
                </FieldDescription>
              )}
              <FieldError errors={[fieldState.error]} className="text-[10px]" />
            </Field>
          )}
        />
      </FieldSection>

      <FieldSection title={copy[noteType].lines}>
        <p className="text-xs text-muted-foreground">
          {copy[noteType].linesHint}
          {noteType === "CREDIT_NOTE" &&
            invoice.balance !== null &&
            ` Puedes acreditar hasta ${money(invoice.balance)}.`}
        </p>
        <LinesEditor form={lines} currency={invoice.currency} />
      </FieldSection>

      {failure && (
        <Alert variant="destructive">
          <AlertTitle>No se emitió la {copy[noteType].title}</AlertTitle>
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
          Emitir {copy[noteType].title}
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
            <AlertDialogTitle>¿Emitir esta {copy[noteType].title} en producción?</AlertDialogTitle>
            <AlertDialogDescription>
              Corrige la factura {invoice.number} de {invoice.customer.legalName} por{" "}
              {confirmation === null ? "" : money(confirmation.total)}. Se envía a la DIAN con
              validez fiscal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={issue.isPending}>Revisar</AlertDialogCancel>
            <Button
              disabled={issue.isPending}
              onClick={() => confirmation && issue.mutate(confirmation.note)}
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
