import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { type } from "arktype";
import { type ReactElement, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { ChoiceField } from "~/components/ChoiceField";
import { Alert, AlertDescription } from "~/components/ui/alert";
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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { auditLogKey } from "~/features/audit-log/queries";
import { activeEnvironmentQuery } from "~/features/environment/queries";
import { issuersQuery } from "~/features/issuers/queries";
import type { SupportTicket, SupportTicketPriority } from "~/lib/api/types";

import { type Attachment, AttachmentDropzone } from "./AttachmentDropzone";
import { supportTicketsQuery } from "./queries";
import { ticketSchema } from "./schema";
import { createSupportTicket } from "./server";

const priorityOptions = [
  { value: "CRITICAL", title: "Crítica", description: "No puedo emitir o todo lo rechaza la DIAN" },
  { value: "HIGH", title: "Alta", description: "Algo está bloqueado, pero sigo emitiendo" },
  { value: "MEDIUM", title: "Media", description: "Me afecta, pero no me bloquea" },
  { value: "LOW", title: "Baja", description: "Busco orientación" },
] as const satisfies readonly {
  value: SupportTicketPriority;
  title: string;
  description: string;
}[];

const noIssuer = "none";

type Values = { message: string; priority: SupportTicketPriority | null; issuerId: string };

/**
 * A ticket to the Cetus team: what happens, how urgent it is and, optionally, which issuer and some
 * files. The API attaches the state of the account and the issuer, and the answer arrives by email.
 */
export function NewTicketDialog({
  issuerId,
  trigger,
  open: openControlled,
  onOpenChange,
}: {
  /** The issuer the ticket starts about, e.g. the one being set up. */
  issuerId?: string;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [openOwn, setOpenOwn] = useState(false);
  const open = openControlled ?? openOwn;
  const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
  const [created, setCreated] = useState<SupportTicket | null>(null);
  const location = useLocation();
  const { data: issuers } = useQuery(issuersQuery);
  const { data: environment } = useQuery(activeEnvironmentQuery);
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: supportTicketsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
      ]),
  });
  const defaultValues: Values = { message: "", priority: null, issuerId: issuerId ?? noIssuer };
  const form = useForm<Values>({ defaultValues });
  const { isSubmitting } = form.formState;
  const uploading = attachments.some((attachment) => attachment.status === "uploading");
  const issuerItems = [
    { label: "Ninguno en particular", value: noIssuer },
    ...(issuers ?? []).map((issuer) => ({
      label: `${issuer.legalName} · NIT ${issuer.nit}`,
      value: issuer.id,
    })),
  ];

  const onSend = form.handleSubmit(async (values) => {
    if (uploading) {
      form.setError("root", { message: "Espera a que terminen de subir los adjuntos." });
      return;
    }
    const parsed = ticketSchema({
      message: values.message,
      priority: values.priority,
      ...(values.issuerId === noIssuer
        ? environment && { environment }
        : { issuerId: values.issuerId }),
      page: location.href.slice(0, 300),
      attachmentIds: attachments.flatMap((attachment) =>
        attachment.status === "uploaded" ? [attachment.id] : [],
      ),
    });
    if (parsed instanceof type.errors) {
      for (const error of parsed) {
        const key = error.path[0];
        if (key === "message" || key === "priority") {
          form.setError(key, { message: error.message });
        }
      }
      return;
    }
    try {
      setCreated(await create.mutateAsync({ data: parsed }));
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error ? error.message : "No pudimos enviar tu caso. Inténtalo de nuevo.",
      });
    }
  });

  function setOpen(next: boolean) {
    if (openControlled === undefined) {
      setOpenOwn(next);
    }
    onOpenChange?.(next);
    if (!next) {
      form.reset(defaultValues);
      setAttachments([]);
      setCreated(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="max-h-[90svh] overflow-y-auto overscroll-contain sm:max-w-lg">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Recibimos tu caso #{created.number}</DialogTitle>
              <DialogDescription>
                El equipo de Cetus te responderá a {created.userEmail}. Si quieres agregar algo,
                responde el correo de confirmación que te enviamos.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button />}>Listo</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSend} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Nuevo caso de soporte</DialogTitle>
              <DialogDescription>
                Te atiende una persona del equipo de Cetus. Adjuntamos el estado de tu cuenta y del
                emisor que elijas, para no tener que pedírtelo.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Controller
                name="message"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="ticket-message">Mensaje</FieldLabel>
                    <Textarea
                      {...field}
                      id="ticket-message"
                      rows={5}
                      className="min-h-28"
                      aria-invalid={fieldState.invalid}
                      aria-describedby="ticket-message-hint"
                    />
                    <FieldDescription id="ticket-message-hint">
                      Qué intentabas hacer, qué pasó y, si lo hay, el mensaje de error.
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="priority"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <ChoiceField
                      label="Prioridad"
                      options={priorityOptions}
                      value={field.value}
                      error={fieldState.error?.message}
                      onChange={field.onChange}
                    />
                  </Field>
                )}
              />
              <Controller
                name="issuerId"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="ticket-issuer">Emisor (opcional)</FieldLabel>
                    <Select
                      items={issuerItems}
                      name={field.name}
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? noIssuer)}
                    >
                      <SelectTrigger id="ticket-issuer" className="w-full" onBlur={field.onBlur}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {issuerItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Field>
                <FieldLabel htmlFor="ticket-attachments">
                  Adjuntos <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <AttachmentDropzone
                  id="ticket-attachments"
                  value={attachments}
                  disabled={isSubmitting}
                  onChange={setAttachments}
                />
              </Field>
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
                {isSubmitting ? "Enviando…" : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
