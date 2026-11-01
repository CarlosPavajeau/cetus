import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Spinner } from "~/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { dayFormat } from "~/features/audit-log/labels";
import { formatCents, orderStatusLabel, reversalKindLabel } from "~/features/billing/labels";
import type { AdminOrder, AdminReversal } from "~/lib/api/types";

import { chargeBackOrder, refundOrder, resolveRefund, waiveDebt } from "./billing";
import { orderActionSchema } from "./billingSchema";
import { adminKey, adminOrdersQuery } from "./queries";

type Action =
  | { kind: "refund"; order: AdminOrder }
  | { kind: "chargeback"; order: AdminOrder }
  | { kind: "waive"; order: AdminOrder }
  | { kind: "resolve"; order: AdminOrder; reversal: AdminReversal };

const orderKindLabel: Record<AdminOrder["kind"], string> = {
  PURCHASE: "Compra",
  RENEWAL: "Renovación",
  MANUAL: "Manual",
  DEBT: "Saldo pendiente",
};

const reversalStatusLabel: Record<AdminReversal["status"], string> = {
  REQUESTED: "Pedido",
  SUBMITTED: "Sin respuesta de Wompi",
  APPROVED: "Aprobado",
  FAILED: "Fallido",
};

/** The account's orders for the Cetus team: support reads them, admins give money back and forgive debts. */
export function AdminOrders({ accountId, isAdmin }: { accountId: string; isAdmin: boolean }) {
  const { data: orders } = useSuspenseQuery(adminOrdersQuery(accountId));
  const [action, setAction] = useState<Action | null>(null);

  if (orders.length === 0) {
    return <p className="text-xs text-muted-foreground">Todavía no tiene órdenes.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Orden</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Devoluciones</TableHead>
            {isAdmin && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const live = order.reversals.find(
              (reversal) => reversal.status === "REQUESTED" || reversal.status === "SUBMITTED",
            );
            const unanswered = order.reversals.find((reversal) => reversal.status === "SUBMITTED");
            const reversible = order.status === "PAID" && order.refundableCents > 0 && !live;
            const debt = order.kind === "DEBT" && order.status === "PENDING";
            return (
              <TableRow key={order.id}>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-0.5">
                    <code className="text-xs">{order.reference}</code>
                    <span className="text-2xs text-muted-foreground">
                      {`${orderKindLabel[order.kind]} · ${dayFormat.format(new Date(order.paidAt ?? order.createdAt))}`}
                      {order.paymentMethodType && ` · ${order.paymentMethodType}`}
                    </span>
                    {order.reviewReason && (
                      <span className="text-2xs text-destructive">{order.reviewReason}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="align-top text-xs">
                  {orderStatusLabel[order.status]}
                </TableCell>
                <TableCell className="text-right align-top text-xs tabular-nums">
                  {formatCents(order.totalCents)}
                  {order.paidAt && (
                    <span className="block text-2xs text-muted-foreground">
                      {`Usado ${formatCents(order.consumedCents)}`}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <ul className="flex flex-col gap-1 text-2xs">
                    {order.reversals.map((reversal) => (
                      <li key={reversal.id}>
                        {`${reversalKindLabel[reversal.kind]} ${formatCents(reversal.amountCents)} · `}
                        <Badge variant={reversal.status === "FAILED" ? "destructive" : "secondary"}>
                          {reversalStatusLabel[reversal.status]}
                        </Badge>
                        {reversal.debtCents !== null && reversal.debtCents > 0 && (
                          <span>{` · deuda de ${formatCents(reversal.debtCents)}`}</span>
                        )}
                        {reversal.failureMessage && (
                          <span className="block text-muted-foreground">
                            {reversal.failureMessage}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </TableCell>
                {isAdmin && (
                  <TableCell className="align-top">
                    {(reversible || debt || unanswered) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon" aria-label="Acciones" />}
                        >
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-auto">
                          {reversible && (
                            <>
                              <DropdownMenuItem
                                onClick={() => setAction({ kind: "refund", order })}
                              >
                                Reembolsar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setAction({ kind: "chargeback", order })}
                              >
                                Registrar contracargo
                              </DropdownMenuItem>
                            </>
                          )}
                          {debt && (
                            <DropdownMenuItem onClick={() => setAction({ kind: "waive", order })}>
                              Condonar el saldo
                            </DropdownMenuItem>
                          )}
                          {unanswered && (
                            <DropdownMenuItem
                              onClick={() =>
                                setAction({ kind: "resolve", order, reversal: unanswered })
                              }
                            >
                              Resolver el reembolso
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {action && (
        <OrderActionDialog accountId={accountId} action={action} onClose={() => setAction(null)} />
      )}
    </>
  );
}

const modeOptions = [
  { value: "WOMPI", label: "Pedirlo a Wompi" },
  { value: "EXTERNAL", label: "Ya se devolvió por fuera" },
] as const;

const outcomeOptions = [
  { value: "true", label: "Aprobado" },
  { value: "false", label: "No se hizo" },
] as const;

const copy = {
  refund: {
    title: "Reembolsar",
    lead: "Los créditos no usados de la orden se revocan al aprobarse, sea cual sea el monto. Se emite una nota crédito sobre la factura.",
    submit: "Reembolsar",
  },
  chargeback: {
    title: "Registrar contracargo",
    lead: "El banco devolvió el pago. Se revocan los créditos no usados, se emite una nota crédito y lo usado queda como saldo pendiente, que bloquea nuevas compras.",
    submit: "Registrar",
  },
  waive: {
    title: "Condonar el saldo",
    lead: "La cuenta no tendrá que pagarlo y podrá volver a comprar.",
    submit: "Condonar",
  },
  resolve: {
    title: "Resolver el reembolso",
    lead: "Wompi nunca respondió este reembolso. Revisa su panel y registra lo que muestra.",
    submit: "Guardar",
  },
} as const;

function OrderActionDialog({
  accountId,
  action,
  onClose,
}: {
  accountId: string;
  action: Action;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const text = copy[action.kind];
  const orderId = action.order.id;
  const refund = action.kind === "refund";
  const form = useForm({
    resolver: arktypeResolver(orderActionSchema),
    defaultValues: {
      reason: "",
      amountPesos: action.order.refundSuggestedCents / 100,
      mode: action.order.transactionId ? ("WOMPI" as const) : ("EXTERNAL" as const),
      approved: "true" as const,
    },
  });
  const change = useMutation({
    mutationFn: async (values: {
      reason: string;
      amountPesos: number;
      mode: "WOMPI" | "EXTERNAL";
      approved: string;
    }) => {
      const ids = { accountId, orderId };
      switch (action.kind) {
        case "refund":
          return refundOrder({
            data: {
              ...ids,
              amountPesos: values.amountPesos,
              mode: values.mode,
              reason: values.reason,
            },
          });
        case "chargeback":
          return chargeBackOrder({ data: { ...ids, reason: values.reason } });
        case "waive":
          return waiveDebt({ data: { ...ids, reason: values.reason } });
        default:
          return resolveRefund({
            data: {
              ...ids,
              reversalId: action.reversal.id,
              approved: values.approved === "true",
              reason: values.reason,
            },
          });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKey });
      onClose();
    },
    onError: (error) => {
      form.setError("root", { message: error.message });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (refund && !(values.amountPesos > 0)) {
      form.setError("amountPesos", { message: "Escribe un monto mayor que cero." });
      return;
    }
    change.mutate(values);
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{`${text.title} ${action.order.reference}`}</DialogTitle>
            <DialogDescription>{text.lead}</DialogDescription>
          </DialogHeader>
          {refund && (
            <>
              <Controller
                name="amountPesos"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="refund-amount">Monto en pesos</FieldLabel>
                    <Input
                      id="refund-amount"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={1}
                      value={Number.isNaN(field.value) ? "" : field.value}
                      onChange={(event) => field.onChange(event.target.valueAsNumber)}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      {`Pagado ${formatCents(action.order.totalCents)}, usado ${formatCents(action.order.consumedCents)}; quedan ${formatCents(action.order.refundableCents)} por devolver. La sugerencia deja a la cuenta pagando solo lo que usó.`}
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="mode"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Cómo se devuelve</FieldLabel>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-label="Cómo se devuelve"
                    >
                      {modeOptions.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem
                            value={option.value}
                            disabled={option.value === "WOMPI" && !action.order.transactionId}
                          />
                          {option.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </Field>
                )}
              />
            </>
          )}
          {action.kind === "resolve" && (
            <Controller
              name="approved"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{`Reembolso de ${formatCents(action.reversal.amountCents)} en Wompi`}</FieldLabel>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-label="Resultado"
                  >
                    {outcomeOptions.map((option) => (
                      <label key={option.value} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={option.value} />
                        {option.label}
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
                <FieldLabel htmlFor="order-action-reason">Motivo</FieldLabel>
                <Textarea
                  {...field}
                  id="order-action-reason"
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
            <Button type="submit" disabled={change.isPending}>
              {change.isPending && <Spinner data-icon="inline-start" />}
              {text.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
