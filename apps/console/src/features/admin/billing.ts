import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { AdminOrder, Reconciliation } from "~/lib/api/types";

import { reasonSchema, refundSchema } from "./billingSchema";
import { requireStaff } from "./server";

const messages: Record<string, string> = {
  refund_exceeds_paid: "El monto supera lo que queda por devolver de la orden.",
  payment_transaction_missing:
    "La orden no tiene un pago aprobado en Wompi: registra un reembolso hecho por fuera.",
  payments_not_configured: "Los pagos con Wompi no están configurados en este ambiente.",
  order_not_paid: "Solo una orden pagada puede devolver dinero.",
  reversal_in_progress: "Ya hay una devolución en curso para esta orden: espera a que termine.",
  order_not_debt: "Solo se condona un saldo pendiente.",
  reversal_not_unresolved: "Ese reembolso ya tiene respuesta.",
};

/** Calls the API and turns its errors into a message the team can act on. */
async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof CetusApiError) {
      throw new Error(
        messages[error.code] ??
          "No pudimos hacer el cambio. Recarga la página e inténtalo de nuevo.",
        { cause: error },
      );
    }
    throw error;
  }
}

const orderIds = type({ accountId: "string.uuid", orderId: "string.uuid" });

/** The account's latest orders with what went back from each. */
export const listAdminOrders = createServerFn({ method: "GET" })
  .validator(type({ accountId: "string.uuid" }))
  .handler(async ({ data }): Promise<AdminOrder[]> => {
    await requireStaff();
    return api.get("/admin/accounts/{accountId}/orders", { params: { path: data } });
  });

export const refundOrder = createServerFn({ method: "POST" })
  .validator(orderIds.and(refundSchema))
  .handler(async ({ data: { accountId, orderId, ...refund } }) => {
    await requireStaff("admin");
    return call(() =>
      api.post("/admin/accounts/{accountId}/orders/{orderId}/refunds", {
        params: { path: { accountId, orderId } },
        body: {
          amountCents: Math.round(refund.amountPesos * 100),
          mode: refund.mode,
          reason: refund.reason,
        },
      }),
    );
  });

export const chargeBackOrder = createServerFn({ method: "POST" })
  .validator(orderIds.and(reasonSchema))
  .handler(async ({ data: { accountId, orderId, reason } }) => {
    await requireStaff("admin");
    return call(() =>
      api.post("/admin/accounts/{accountId}/orders/{orderId}/chargeback", {
        params: { path: { accountId, orderId } },
        body: { reason },
      }),
    );
  });

export const waiveDebt = createServerFn({ method: "POST" })
  .validator(orderIds.and(reasonSchema))
  .handler(async ({ data: { accountId, orderId, reason } }) => {
    await requireStaff("admin");
    return call(() =>
      api.post("/admin/accounts/{accountId}/orders/{orderId}/waiver", {
        params: { path: { accountId, orderId } },
        body: { reason },
      }),
    );
  });

export const resolveRefund = createServerFn({ method: "POST" })
  .validator(orderIds.and({ reversalId: "string.uuid", approved: "boolean" }).and(reasonSchema))
  .handler(async ({ data: { accountId, orderId, reversalId, approved, reason } }) => {
    await requireStaff("admin");
    return call(() =>
      api.post("/admin/accounts/{accountId}/orders/{orderId}/reversals/{reversalId}/resolution", {
        params: { path: { accountId, orderId, reversalId } },
        body: { approved, reason },
      }),
    );
  });

const month = type({ month: /^20\d{2}-(0[1-9]|1[0-2])$/ });

/** The month's sales crossed with Wompi and the invoices. */
export const getReconciliation = createServerFn({ method: "GET" })
  .validator(month)
  .handler(async ({ data }): Promise<Reconciliation> => {
    await requireStaff();
    return api.get("/admin/billing/reconciliation", { params: { query: data } });
  });

/** Asks Wompi again for the payments of the month's orders. */
export const refreshReconciliation = createServerFn({ method: "POST" })
  .validator(month)
  .handler(async ({ data }) => {
    await requireStaff("admin");
    return call(() =>
      api.post("/admin/billing/reconciliation/checks", { params: { query: data } }),
    );
  });
