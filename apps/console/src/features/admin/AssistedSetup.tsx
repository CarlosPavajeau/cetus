import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LinkIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { CopyButton } from "~/components/CopyButton";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { FieldGroup } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { dayFormat, timeFormat } from "~/features/audit-log/labels";
import { DateField, SecretField, TextField } from "~/features/setup/fields";
import { emptyRange, habilitacionRange } from "~/features/setup/NumberingStep";
import { numberingSchema, softwareSchema } from "~/features/setup/schema";
import { FieldRow } from "~/features/setup/StepLayout";
import type { IssuerDetail } from "~/lib/api/types";

import { addAdminRange, createCertificateUploadLink, setAdminSoftware } from "./issuers";
import { adminKey } from "./queries";

type Ids = { accountId: string; issuerId: string };

function useInvalidateAdmin() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: adminKey });
}

function RootError({ message }: { message?: string }) {
  return message ? (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;
}

/** Sets the DIAN software of the issuer for the customer: Software ID, PIN and, in habilitación, the test set. */
export function SoftwareDialog({ ids, issuer }: { ids: Ids; issuer: IssuerDetail }) {
  const [open, setOpen] = useState(false);
  const invalidate = useInvalidateAdmin();
  const form = useForm({
    resolver: arktypeResolver(softwareSchema),
    defaultValues: {
      softwareId: issuer.software?.softwareId ?? "",
      pin: "",
      testSetId: issuer.software?.testSetId ?? "",
    },
  });
  const save = useMutation({ mutationFn: setAdminSoftware });
  const onSubmit = form.handleSubmit(async (software) => {
    try {
      await save.mutateAsync({ data: { ...ids, software } });
    } catch (error) {
      form.setError("root", { message: (error as Error).message });
      return;
    }
    await invalidate();
    setOpen(false);
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        {issuer.software ? "Cambiar software" : "Configurar software"}
      </DialogTrigger>
      <DialogContent>
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Software de la DIAN</DialogTitle>
            <DialogDescription>
              Los datos que el cliente te compartió del portal de la DIAN. El PIN se guarda cifrado.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <TextField
              control={form.control}
              name="softwareId"
              label="Software ID"
              autoComplete="off"
            />
            <SecretField control={form.control} name="pin" label="PIN del software" />
            {issuer.environment === "TEST" && (
              <TextField
                control={form.control}
                name="testSetId"
                label="TestSetId"
                autoComplete="off"
                hint="Vacío si ya terminó el set de pruebas."
              />
            )}
          </FieldGroup>
          <RootError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Adds an invoice range from the customer's resolution (in habilitación, the DIAN's shared test range). */
export function RangeDialog({ ids, issuer }: { ids: Ids; issuer: IssuerDetail }) {
  const [open, setOpen] = useState(false);
  const invalidate = useInvalidateAdmin();
  const form = useForm({
    resolver: arktypeResolver(numberingSchema),
    defaultValues: issuer.environment === "TEST" ? habilitacionRange : emptyRange,
  });
  const add = useMutation({ mutationFn: addAdminRange });
  const onSubmit = form.handleSubmit(async (range) => {
    try {
      await add.mutateAsync({ data: { ...ids, range } });
    } catch (error) {
      form.setError("root", { message: (error as Error).message });
      return;
    }
    await invalidate();
    setOpen(false);
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Agregar rango</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <form noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Rango de facturación</DialogTitle>
            <DialogDescription>Tal como aparece en la resolución de la DIAN.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <FieldRow className="sm:grid-cols-2">
              <TextField
                control={form.control}
                name="resolutionNumber"
                label="Número de resolución"
                inputMode="numeric"
              />
              <DateField control={form.control} name="resolutionDate" label="Fecha de resolución" />
            </FieldRow>
            <FieldRow>
              <TextField control={form.control} name="prefix" label="Prefijo" autoComplete="off" />
              <TextField
                control={form.control}
                name="from"
                label="Número inicial"
                inputMode="numeric"
              />
              <TextField
                control={form.control}
                name="to"
                label="Número final"
                inputMode="numeric"
              />
            </FieldRow>
            <FieldRow className="sm:grid-cols-2">
              <DateField control={form.control} name="validFrom" label="Vigencia desde" />
              <DateField control={form.control} name="validTo" label="Vigencia hasta" />
            </FieldRow>
            <SecretField control={form.control} name="technicalKey" label="Clave técnica" />
          </FieldGroup>
          <RootError message={form.formState.errors.root?.message} />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner data-icon="inline-start" />}
              Agregar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Generates the one-time link for the customer to upload the certificate. The URL is shown once and only
 * here; a new link replaces the previous one.
 */
export function CertificateLink({ ids }: { ids: Ids }) {
  const invalidate = useInvalidateAdmin();
  const create = useMutation({ mutationFn: createCertificateUploadLink, onSuccess: invalidate });

  if (create.data) {
    const expiresAt = new Date(create.data.expiresAt);
    return (
      <Alert>
        <LinkIcon />
        <AlertTitle>Envía este enlace al cliente</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>
            Sirve una sola vez y vence el {dayFormat.format(expiresAt)} a las{" "}
            {timeFormat.format(expiresAt)}. No lo volverás a ver.
          </span>
          <code className="text-2xs break-all">{create.data.url}</code>
          <CopyButton value={create.data.url} label="Copiar enlace" />
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => create.mutate({ data: ids })}
        disabled={create.isPending}
      >
        {create.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <LinkIcon data-icon="inline-start" />
        )}
        Generar enlace de carga
      </Button>
      {create.isError && (
        <p className="text-2xs text-destructive">No pudimos generar el enlace. Intenta de nuevo.</p>
      )}
    </div>
  );
}
