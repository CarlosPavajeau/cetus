import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { CheckIcon, CopyIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import type { Environment } from "~/lib/api/types";

import { eventTypeLabel } from "./labels";
import { webhookEndpointsQuery, webhookEventTypesQuery } from "./queries";
import { createWebhookEndpointSchema } from "./schema";
import { createWebhookEndpoint } from "./server";

const environmentItems: { label: string; value: Environment }[] = [
  { label: "Simulación (sin la DIAN)", value: "SANDBOX" },
  { label: "Pruebas (habilitación DIAN)", value: "TEST" },
  { label: "Producción", value: "LIVE" },
];

const defaultValues = {
  url: "",
  environment: "TEST" as Environment,
  description: "",
  eventTypes: [] as string[],
};

/** Registers a URL and shows its signing secret, once. */
export function CreateWebhookEndpoint() {
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: eventTypes } = useSuspenseQuery(webhookEventTypesQuery);
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createWebhookEndpoint,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: webhookEndpointsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
      ]),
  });
  const form = useForm({ resolver: arktypeResolver(createWebhookEndpointSchema), defaultValues });
  const { isSubmitting } = form.formState;

  const onCreate = form.handleSubmit(async (values) => {
    try {
      const created = await create.mutateAsync({ data: values });
      setSecret(created.secret);
      setCopied(false);
      form.reset(defaultValues);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "No pudimos registrar el webhook. Inténtalo de nuevo.",
      });
    }
  });

  async function copySecret() {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    // Forget the secret once the dialog closes: it is shown only once.
    if (!next) {
      setSecret(null);
      form.reset(defaultValues);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Registrar webhook
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle>Copia el secreto de firma ahora</DialogTitle>
              <DialogDescription>
                Úsalo para verificar la cabecera <code>webhook-signature</code> de cada envío. Por
                seguridad solo lo mostramos una vez.
              </DialogDescription>
            </DialogHeader>
            <InputGroup>
              <InputGroupInput
                value={secret}
                readOnly
                aria-label="Secreto de firma"
                className="font-mono"
              />
              <InputGroupAddon align="inline-end">
                <InputGroupButton onClick={copySecret}>
                  {copied ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <CopyIcon data-icon="inline-start" />
                  )}
                  {copied ? "Copiado" : "Copiar"}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            <DialogFooter>
              <DialogClose render={<Button />}>Listo</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onCreate} noValidate className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Nuevo webhook</DialogTitle>
              <DialogDescription>
                Cetus enviará un POST firmado a esta URL cuando cambie uno de tus documentos del
                ambiente elegido.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Controller
                name="url"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="webhook-url">URL</FieldLabel>
                    <Input
                      {...field}
                      id="webhook-url"
                      type="url"
                      placeholder="https://erp.example.com/webhooks/cetus"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="environment"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="webhook-environment">Ambiente</FieldLabel>
                    <Select
                      items={environmentItems}
                      name={field.name}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger
                        id="webhook-environment"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                        onBlur={field.onBlur}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {environmentItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="webhook-description">Descripción (opcional)</FieldLabel>
                    <Input
                      {...field}
                      id="webhook-description"
                      placeholder="ERP de producción"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="eventTypes"
                control={form.control}
                render={({ field }) => (
                  <FieldSet>
                    <FieldLegend variant="label">Eventos</FieldLegend>
                    <FieldDescription>Sin ninguno marcado, recibe todos.</FieldDescription>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {eventTypes.map((eventType) => (
                        <Field key={eventType} orientation="horizontal">
                          <Checkbox
                            id={`webhook-event-${eventType}`}
                            checked={field.value.includes(eventType)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked
                                  ? [...field.value, eventType]
                                  : field.value.filter((value) => value !== eventType),
                              )
                            }
                          />
                          <FieldLabel
                            htmlFor={`webhook-event-${eventType}`}
                            className="text-xs font-normal"
                          >
                            {eventTypeLabel(eventType)}
                          </FieldLabel>
                        </Field>
                      ))}
                    </div>
                  </FieldSet>
                )}
              />
            </FieldGroup>
            {form.formState.errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />} disabled={isSubmitting}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isSubmitting ? "Registrando…" : "Registrar webhook"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
