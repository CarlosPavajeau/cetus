import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Spinner } from "~/components/ui/spinner";
import { dateFormat } from "~/features/api-keys/formats";
import type { PlanOffer, PlanVersion, Subscription } from "~/lib/api/types";

import { documentsLabel, formatCents, overageLabel } from "./labels";
import { billingKey } from "./queries";
import { overageLimitSchema } from "./schema";
import {
  type SubscriptionResult,
  schedulePlanNext,
  setCancellation,
  setOverageLimit,
} from "./server";

const unreachable = "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo.";

/** The refusal the API gave, or the failure to reach it. */
function failureOf(result: SubscriptionResult | undefined, error: Error | null) {
  if (result && !result.ok) {
    return result.message;
  }
  return error ? unreachable : null;
}

/** How much overage a period may run up; the owner raises it to keep issuing past it. */
export function OverageLimitDialog({ subscription }: { subscription: Subscription }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(overageLimitSchema),
    defaultValues: { pesos: String(subscription.overageLimitCents / 100) },
  });
  const change = useMutation({
    mutationFn: setOverageLimit,
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: billingKey });
        setOpen(false);
      }
    },
  });
  const failure = failureOf(change.data, change.error);
  const onSubmit = form.handleSubmit(({ pesos }) =>
    change.mutate({ data: { overageLimitCents: pesos * 100 } }),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          change.reset();
          form.reset({ pesos: String(subscription.overageLimitCents / 100) });
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Cambiar límite</DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>Límite de excedente</DialogTitle>
            <DialogDescription>
              Cuánto excedente puede sumar cada periodo. Al llegar a él, la emisión en producción se
              detiene hasta el siguiente periodo; las notas crédito siempre se pueden emitir.
            </DialogDescription>
          </DialogHeader>
          <Controller
            name="pesos"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="overage-limit">Límite por periodo, en pesos</FieldLabel>
                <Input
                  {...field}
                  id="overage-limit"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid}
                />
                <FieldDescription>
                  {`${overageLabel(subscription.period.priceOverageCents)}. Por defecto es tres veces la mensualidad.`}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              disabled={change.isPending}
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={change.isPending}>
              {change.isPending && <Spinner data-icon="inline-start" />}
              Guardar límite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const keep = "keep";

/** The plan the next period takes, without proration; the current one stays until the period ends. */
export function PlanNextDialog({
  subscription,
  offers,
}: {
  subscription: Subscription;
  offers: (PlanOffer & { version: PlanVersion })[];
}) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState(subscription.planVersionNextId ?? keep);
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: schedulePlanNext,
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: billingKey });
        setOpen(false);
      }
    },
  });
  const failure = failureOf(change.data, change.error);
  const others = offers.filter((offer) => offer.version.id !== subscription.version.id);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          change.reset();
          setChoice(subscription.planVersionNextId ?? keep);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Cambiar plan</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cambiar plan</DialogTitle>
          <DialogDescription>
            {`El cambio aplica desde el siguiente periodo, el ${dateFormat.format(new Date(subscription.period.endsAt))}, sin prorrateo. La renovación se cobra al precio del plan nuevo.`}
          </DialogDescription>
        </DialogHeader>
        <RadioGroup
          value={choice}
          onValueChange={(value) => setChoice(String(value))}
          aria-label="Plan"
        >
          <label className="flex items-start gap-2 text-sm">
            <RadioGroupItem value={keep} className="mt-0.5" />
            <span>
              {`Seguir en ${subscription.planName}`}
              <span className="block text-muted-foreground">
                {`${formatCents(subscription.version.totalCents)} al mes`}
              </span>
            </span>
          </label>
          {others.map((offer) => (
            <label key={offer.id} className="flex items-start gap-2 text-sm">
              <RadioGroupItem value={offer.version.id} className="mt-0.5" />
              <span>
                {offer.name}
                <span className="block text-muted-foreground">
                  {`${formatCents(offer.version.totalCents)} al mes · ${documentsLabel(offer.version.documentsIncluded)}${offer.version.priceOverageCents === null ? "" : ` · ${overageLabel(offer.version.priceOverageCents)}`}`}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" type="button" />}
            disabled={change.isPending}
          >
            Cancelar
          </DialogClose>
          <Button
            onClick={() =>
              change.mutate({ data: { planVersionId: choice === keep ? null : choice } })
            }
            disabled={change.isPending}
          >
            {change.isPending && <Spinner data-icon="inline-start" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Ends the subscription with the open period, or keeps it renewing. */
export function CancellationDialog({ subscription }: { subscription: Subscription }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const cancel = !subscription.cancelAtPeriodEnd;
  const change = useMutation({
    mutationFn: setCancellation,
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: billingKey });
        setOpen(false);
      }
    },
  });
  const failure = failureOf(change.data, change.error);
  const until = dateFormat.format(new Date(subscription.period.endsAt));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          change.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant={cancel ? "outline" : "default"} />}>
        {cancel ? "Cancelar suscripción" : "Reanudar suscripción"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cancel ? "Cancelar al final del periodo" : "Reanudar la suscripción"}
          </DialogTitle>
          <DialogDescription>
            {cancel
              ? `La suscripción sigue hasta el ${until} y no se renueva. Ese día se cobra el excedente del periodo, si lo hay. Los documentos ya otorgados conservan su vigencia.`
              : `La suscripción se renueva el ${until} como de costumbre.`}
          </DialogDescription>
        </DialogHeader>
        {failure && (
          <Alert variant="destructive">
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline" type="button" />}
            disabled={change.isPending}
          >
            Volver
          </DialogClose>
          <Button
            variant={cancel ? "destructive" : "default"}
            onClick={() => change.mutate({ data: { cancel } })}
            disabled={change.isPending}
          >
            {change.isPending && <Spinner data-icon="inline-start" />}
            {cancel ? "Cancelar al final del periodo" : "Reanudar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
