import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MailCheckIcon, MailIcon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";
import type { Contact, ContactCategory } from "~/lib/api/types";

import { categoryTitle } from "./labels";
import { contactsQuery } from "./queries";
import { changeContactSchema } from "./schema";
import { cancelContactChange, changeContact, resendContactVerification } from "./server";

function useInvalidateContacts() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: contactsQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: auditLogKey }),
    ]);
}

/** One category: who receives its notices now, and a change waiting for verification. */
export function ContactCard({
  category,
  title,
  description,
  contact,
  readOnly,
}: {
  category: ContactCategory;
  title: string;
  description: string;
  contact: Contact | undefined;
  readOnly: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {!readOnly && (
          <CardAction>
            <ChangeContact category={category} current={contact?.email} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {contact ? (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <MailCheckIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-medium break-all">{contact.email}</span>
            <Badge variant="secondary">Verificado</Badge>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Sin contacto: estos avisos no se envían a nadie.
          </p>
        )}
        {contact?.pendingEmail && (
          <PendingChange
            category={category}
            pendingEmail={contact.pendingEmail}
            readOnly={readOnly}
          />
        )}
      </CardContent>
    </Card>
  );
}

function PendingChange({
  category,
  pendingEmail,
  readOnly,
}: {
  category: ContactCategory;
  pendingEmail: string;
  readOnly: boolean;
}) {
  const invalidate = useInvalidateContacts();
  const resend = useMutation({ mutationFn: resendContactVerification, onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: cancelContactChange, onSuccess: invalidate });
  const error = resend.error ?? cancel.error;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <MailIcon className="size-4 text-muted-foreground" aria-hidden />
        <span className="break-all">{pendingEmail}</span>
        <Badge variant="outline">Pendiente de verificación</Badge>
      </p>
      <p className="text-xs text-muted-foreground">
        Le enviamos un enlace que vence en 48 horas. Hasta que lo abra, los avisos siguen llegando
        al correo verificado.
      </p>
      {!readOnly && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={resend.isPending || cancel.isPending}
            onClick={() => resend.mutate({ data: { category } })}
          >
            {resend.isPending && <Spinner data-icon="inline-start" />}
            Reenviar el enlace
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={resend.isPending || cancel.isPending}
            onClick={() => cancel.mutate({ data: { category } })}
          >
            {cancel.isPending && <Spinner data-icon="inline-start" />}
            Cancelar el cambio
          </Button>
        </div>
      )}
      {resend.isSuccess && !error && (
        <output className="text-xs text-muted-foreground">Enviamos un enlace nuevo.</output>
      )}
      {error && (
        <output className="text-xs text-destructive">
          {error instanceof Error ? error.message : "No pudimos hacerlo. Inténtalo de nuevo."}
        </output>
      )}
    </div>
  );
}

function ChangeContact({ category, current }: { category: ContactCategory; current?: string }) {
  const [open, setOpen] = useState(false);
  const invalidate = useInvalidateContacts();
  const change = useMutation({ mutationFn: changeContact, onSuccess: invalidate });
  const form = useForm({
    resolver: arktypeResolver(changeContactSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (contact) => {
    try {
      await change.mutateAsync({ data: { category, contact } });
      setOpen(false);
      form.reset();
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "No pudimos guardar el cambio. Inténtalo de nuevo.",
      });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon data-icon="inline-start" />
        Cambiar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cambiar el contacto de avisos {categoryTitle[category]}</DialogTitle>
          <DialogDescription>
            Enviaremos un enlace al correo nuevo. Los avisos le llegarán cuando lo abra
            {current ? `; mientras tanto siguen llegando a ${current}` : ""}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`contact-${category}`}>Correo</FieldLabel>
                  <Input
                    {...field}
                    id={`contact-${category}`}
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Puede ser de cualquier persona, por ejemplo tu contador o tu equipo técnico.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <DialogClose render={<Button variant="outline" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              Enviar verificación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
