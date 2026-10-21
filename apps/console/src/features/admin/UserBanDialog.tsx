import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { type Control, Controller, type Path, useForm } from "react-hook-form";

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
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";

import { adminKey } from "./queries";
import { banDurations, banSchema, statusChangeSchema } from "./schema";
import { banUser, unbanUser } from "./users";

const durationLabel: Record<string, string> = {
  "1": "1 día",
  "7": "7 días",
  "30": "30 días",
  indefinite: "Hasta que se desbloquee",
};

type Target = { id: string; email: string };

function ReasonField<T extends { reason: string }>({
  control,
  id,
}: {
  control: Control<T>;
  id: string;
}) {
  return (
    <Controller
      name={"reason" as Path<T>}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>Motivo</FieldLabel>
          <Textarea
            {...field}
            value={field.value as string}
            id={id}
            rows={3}
            maxLength={500}
            aria-invalid={fieldState.invalid}
          />
          <FieldDescription>Queda en el registro de auditoría.</FieldDescription>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

/** Bans a person: they lose their session at once and cannot sign in until it ends or is lifted. */
export function BanUserDialog({ target }: { target: Target }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(banSchema),
    defaultValues: { reason: "", days: 7 as (typeof banDurations)[number] | null },
  });
  const ban = useMutation({
    mutationFn: banUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKey });
      setOpen(false);
      form.reset();
    },
    onError: (error) =>
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos bloquear al usuario.",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" />}>Bloquear usuario</DialogTrigger>
      <DialogContent>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={form.handleSubmit(({ reason, days }) =>
            ban.mutate({ data: { userId: target.id, reason, days } }),
          )}
        >
          <DialogHeader>
            <DialogTitle>Bloquear a {target.email}</DialogTitle>
            <DialogDescription>
              Pierde su sesión de inmediato y no puede volver a entrar a la consola. Las llaves de
              API de sus organizaciones siguen funcionando.
            </DialogDescription>
          </DialogHeader>
          <Controller
            name="days"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>Duración</FieldLabel>
                <RadioGroup
                  value={field.value === null ? "indefinite" : String(field.value)}
                  onValueChange={(value) =>
                    field.onChange(value === "indefinite" ? null : Number(value))
                  }
                  aria-label="Duración del bloqueo"
                >
                  {[...banDurations.map(String), "indefinite"].map((value) => (
                    <label key={value} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={value} />
                      {durationLabel[value]}
                    </label>
                  ))}
                </RadioGroup>
              </Field>
            )}
          />
          <ReasonField control={form.control} id="ban-reason" />
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={ban.isPending}>
              Cancelar
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={ban.isPending}>
              {ban.isPending && <Spinner data-icon="inline-start" />}
              {ban.isPending ? "Bloqueando…" : "Bloquear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UnbanUserDialog({ target }: { target: Target }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(statusChangeSchema),
    defaultValues: { reason: "" },
  });
  const unban = useMutation({
    mutationFn: unbanUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKey });
      setOpen(false);
      form.reset();
    },
    onError: (error) =>
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos desbloquear al usuario.",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Desbloquear usuario</DialogTrigger>
      <DialogContent>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={form.handleSubmit(({ reason }) =>
            unban.mutate({ data: { userId: target.id, reason } }),
          )}
        >
          <DialogHeader>
            <DialogTitle>Desbloquear a {target.email}</DialogTitle>
            <DialogDescription>Podrá volver a iniciar sesión en la consola.</DialogDescription>
          </DialogHeader>
          <ReasonField control={form.control} id="unban-reason" />
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={unban.isPending}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={unban.isPending}>
              {unban.isPending && <Spinner data-icon="inline-start" />}
              {unban.isPending ? "Desbloqueando…" : "Desbloquear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
