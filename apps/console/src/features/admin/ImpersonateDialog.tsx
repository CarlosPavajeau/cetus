import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { impersonationSeconds } from "~/lib/auth/permissions";

import { startImpersonation } from "./impersonation";
import { impersonationSchema } from "./schema";
import type { UserMembership } from "./users";

/**
 * Opens the console as a person, in one of their organizations, for at most 30 minutes. The account's
 * members see the start in their activity, with the reason.
 */
export function ImpersonateDialog({
  target,
  organizations,
}: {
  target: { id: string; email: string };
  organizations: UserMembership[];
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(impersonationSchema),
    defaultValues: {
      userId: target.id,
      organizationId: organizations[0]?.organizationId ?? "",
      reason: "",
    },
  });
  const start = useMutation({
    mutationFn: startImpersonation,
    onSuccess: () => {
      queryClient.clear();
      // A full load: the new session must reach every guard and cache.
      window.location.assign("/overview");
    },
    onError: (error) =>
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos abrir la consola.",
      }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <EyeIcon data-icon="inline-start" />
        Ver como este usuario
      </DialogTrigger>
      <DialogContent>
        <form
          noValidate
          className="flex flex-col gap-6"
          onSubmit={form.handleSubmit((values) => start.mutate({ data: values }))}
        >
          <DialogHeader>
            <DialogTitle>Ver la consola como {target.email}</DialogTitle>
            <DialogDescription>
              Durante {impersonationSeconds / 60} minutos verás y harás lo mismo que esta persona,
              salvo cargar certificados y crear o revocar llaves de API. La organización verá en su
              actividad que entraste y por qué.
            </DialogDescription>
          </DialogHeader>
          {organizations.length > 1 && (
            <Controller
              name="organizationId"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Organización</FieldLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-label="Organización"
                  >
                    {organizations.map((organization) => (
                      <label
                        key={organization.organizationId}
                        className="flex items-center gap-2 text-sm"
                      >
                        <RadioGroupItem value={organization.organizationId} />
                        {organization.organizationName}
                      </label>
                    ))}
                  </RadioGroup>
                </Field>
              )}
            />
          )}
          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="impersonation-reason">Motivo</FieldLabel>
                <Textarea
                  {...field}
                  id="impersonation-reason"
                  rows={3}
                  maxLength={500}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  Por ejemplo, el caso de soporte que estás atendiendo.
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={start.isPending}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={start.isPending}>
              {start.isPending && <Spinner data-icon="inline-start" />}
              {start.isPending ? "Abriendo…" : "Ver la consola"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
