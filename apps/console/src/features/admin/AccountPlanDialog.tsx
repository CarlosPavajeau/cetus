import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { planDocuments, planIssuers, planPrice } from "~/features/usage/labels";

import { adminKey, adminPlansQuery } from "./queries";
import { planChangeSchema } from "./schema";
import { changeAccountPlan } from "./server";

/** Assigns an account another plan, with a reason for the audit log. Usage is billed against it from now on. */
export function AccountPlanDialog({
  accountId,
  accountName,
  plan,
}: {
  accountId: string;
  accountName: string;
  plan: string;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const plans = useQuery({ ...adminPlansQuery, enabled: open });
  const form = useForm({
    resolver: arktypeResolver(planChangeSchema),
    defaultValues: { plan, reason: "" },
  });
  const change = useMutation({
    mutationFn: changeAccountPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKey });
      setOpen(false);
      form.reset({ plan: form.getValues("plan"), reason: "" });
    },
    onError: () => {
      form.setError("root", {
        message: "No pudimos cambiar el plan. Recarga la página: puede que ya haya cambiado.",
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (values.plan === plan) {
      form.setError("plan", { message: "La cuenta ya tiene este plan." });
      return;
    }
    change.mutate({ data: { id: accountId, ...values } });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>Cambiar plan</DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Cambiar el plan de {accountName}</DialogTitle>
            <DialogDescription>
              El uso del mes se mide contra el plan nuevo desde ahora. Los avisos de consumo se
              vuelven a enviar con su cuota.
            </DialogDescription>
          </DialogHeader>
          <Controller
            name="plan"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Plan</FieldLabel>
                {plans.data === undefined ? (
                  plans.isError ? (
                    <p className="text-xs text-destructive">No pudimos cargar los planes.</p>
                  ) : (
                    <Spinner />
                  )
                ) : (
                  <RadioGroup value={field.value} onValueChange={field.onChange} aria-label="Plan">
                    {plans.data.map((option) => (
                      <label key={option.code} className="flex items-start gap-2 text-sm">
                        <RadioGroupItem value={option.code} className="mt-0.5" />
                        <span className="flex flex-col gap-0.5">
                          {option.name}
                          <span className="text-xs text-muted-foreground">
                            {planPrice(option)} · {planDocuments(option)} · {planIssuers(option)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="reason"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="account-plan-reason">Motivo</FieldLabel>
                <Textarea
                  {...field}
                  id="account-plan-reason"
                  rows={3}
                  maxLength={500}
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>Queda en el registro de auditoría de la cuenta.</FieldDescription>
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
            <DialogClose render={<Button variant="outline" />} disabled={change.isPending}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={change.isPending || !plans.isSuccess}>
              {change.isPending && <Spinner data-icon="inline-start" />}
              {change.isPending ? "Cambiando…" : "Cambiar plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
