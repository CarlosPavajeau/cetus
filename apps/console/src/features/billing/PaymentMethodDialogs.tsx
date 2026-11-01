import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import type { Order, PaymentMethod } from "~/lib/api/types";

import { cardLabel } from "./labels";
import { billingKey } from "./queries";
import { type CardForm, cardFormSchema } from "./schema";
import {
  type BillingResult,
  chargeOrder,
  getCardSetup,
  type OrderResult,
  removePaymentMethod,
  savePaymentMethod,
} from "./server";
import { tokenizeCard } from "./wompi";

const unreachable = "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo.";

const emptyCard = {
  number: "",
  expiry: "",
  cvc: "",
  holder: "",
  terms: false,
  personalData: false,
};

/**
 * Saves the card that pays the renewals, replacing the one before. The browser sends the card to Wompi and only
 * Wompi's token reaches Cetus.
 */
export function PaymentMethodDialog({ paymentMethod }: { paymentMethod: PaymentMethod | null }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const setup = useQuery({
    queryKey: [...billingKey, "card-setup"],
    queryFn: () => getCardSetup(),
    enabled: open,
    staleTime: 0,
    gcTime: 0,
  });
  const form = useForm({ resolver: arktypeResolver(cardFormSchema), defaultValues: emptyCard });
  const save = useMutation({
    mutationFn: async (card: CardForm): Promise<BillingResult> => {
      if (!setup.data?.ok) {
        return { ok: false, message: unreachable };
      }
      const tokenized = await tokenizeCard(setup.data.setup, card);
      if (!tokenized.ok) {
        return tokenized;
      }
      return savePaymentMethod({
        data: {
          cardToken: tokenized.token.id,
          acceptanceToken: setup.data.setup.endUserPolicy.token,
          personalDataAuthToken: setup.data.setup.personalDataAuth.token,
          brand: tokenized.token.brand,
          expMonth: tokenized.token.expMonth,
          expYear: tokenized.token.expYear,
        },
      });
    },
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: billingKey });
        setOpen(false);
      }
    },
  });
  const failure =
    (save.data && !save.data.ok && save.data.message) ||
    (setup.data && !setup.data.ok && setup.data.message) ||
    (save.error || setup.error ? unreachable : null);
  const terms = setup.data?.ok ? setup.data.setup : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          save.reset();
          form.reset(emptyCard);
        }
      }}
    >
      <DialogTrigger render={<Button variant={paymentMethod ? "outline" : "default"} />}>
        {paymentMethod ? "Cambiar tarjeta" : "Activar cobro automático"}
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={form.handleSubmit((card) => save.mutate(card))}
          noValidate
          className="flex flex-col gap-6"
        >
          <DialogHeader>
            <DialogTitle>
              {paymentMethod ? "Cambiar la tarjeta" : "Guardar una tarjeta"}
            </DialogTitle>
            <DialogDescription>
              Cobraremos a esta tarjeta cada renovación de tu suscripción, con el excedente del
              periodo. Te avisamos antes de cada cobro. Los datos de la tarjeta van directo a Wompi;
              Cetus solo guarda la marca, los últimos cuatro dígitos y el vencimiento.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="number"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="card-number">Número de la tarjeta</FieldLabel>
                  <Input
                    {...field}
                    id="card-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                name="expiry"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="card-expiry">Vencimiento (MM/AA)</FieldLabel>
                    <Input
                      {...field}
                      id="card-expiry"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="cvc"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="card-cvc">Código de seguridad</FieldLabel>
                    <Input
                      {...field}
                      id="card-cvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
            <Controller
              name="holder"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="card-holder">Nombre en la tarjeta</FieldLabel>
                  <Input
                    {...field}
                    id="card-holder"
                    autoComplete="cc-name"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="terms"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                  <Checkbox
                    id="card-terms"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="card-terms" className="font-normal">
                      <span>
                        Acepto los{" "}
                        {terms ? (
                          <a
                            href={terms.endUserPolicy.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4"
                          >
                            términos y condiciones de Wompi
                          </a>
                        ) : (
                          "términos y condiciones de Wompi"
                        )}
                      </span>
                    </FieldLabel>
                    <FieldError errors={[fieldState.error]} />
                  </FieldContent>
                </Field>
              )}
            />
            <Controller
              name="personalData"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                  <Checkbox
                    id="card-personal-data"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor="card-personal-data" className="font-normal">
                      <span>
                        Autorizo el{" "}
                        {terms ? (
                          <a
                            href={terms.personalDataAuth.permalink}
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4"
                          >
                            tratamiento de mis datos personales por Wompi
                          </a>
                        ) : (
                          "tratamiento de mis datos personales por Wompi"
                        )}
                      </span>
                    </FieldLabel>
                    <FieldError errors={[fieldState.error]} />
                  </FieldContent>
                </Field>
              )}
            />
          </FieldGroup>
          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" type="button" />}
              disabled={save.isPending}
            >
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={save.isPending || !terms}>
              {(save.isPending || setup.isFetching) && <Spinner data-icon="inline-start" />}
              Guardar tarjeta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Stops charging the card; the renewals wait to be paid from their order. */
export function RemovePaymentMethodDialog({ paymentMethod }: { paymentMethod: PaymentMethod }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: () => removePaymentMethod(),
    onSuccess: async (result) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: billingKey });
        setOpen(false);
      }
    },
  });
  const failure =
    (remove.data && !remove.data.ok && remove.data.message) || (remove.error ? unreachable : null);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          remove.reset();
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Quitar tarjeta</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quitar la tarjeta</DialogTitle>
          <DialogDescription>
            {`Dejaremos de cobrar a ${cardLabel(paymentMethod)}. Cada renovación te llegará como una orden para pagar con el medio que prefieras.`}
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
            disabled={remove.isPending}
          >
            Volver
          </DialogClose>
          <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
            {remove.isPending && <Spinner data-icon="inline-start" />}
            Quitar tarjeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Charges the pending order to the saved card now; the order page follows how it goes. */
export function ChargeOrderButton({
  order,
  paymentMethod,
}: {
  order: Order;
  paymentMethod: PaymentMethod;
}) {
  const queryClient = useQueryClient();
  const charge = useMutation({
    mutationFn: () => chargeOrder({ data: { id: order.id } }),
    onSuccess: async (result: OrderResult) => {
      if (result.ok) {
        await queryClient.invalidateQueries({ queryKey: [...billingKey, "orders"] });
      }
    },
  });
  const failure =
    (charge.data && !charge.data.ok && charge.data.message) || (charge.error ? unreachable : null);
  const charging = order.charge?.status === "SUBMITTED";

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={() => charge.mutate()} disabled={charge.isPending || charging}>
        {(charge.isPending || charging) && <Spinner data-icon="inline-start" />}
        {`Pagar con ${cardLabel(paymentMethod)}`}
      </Button>
      {failure && (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
