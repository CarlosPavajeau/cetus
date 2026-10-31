import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import type { DocumentFileUrl } from "~/features/documents/server";
import { customerExtrasSchema, toCustomerRequest } from "~/features/issuance/schema";
import { CetusApiError, api } from "~/lib/api/client";
import type { BillingProfile, DocumentFile, Order, Subscription } from "~/lib/api/types";

import { billingProfileSchema } from "./schema";

export const getCredits = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/credits"),
);

export const listPlanOffers = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/plans"),
);

export const listOrders = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/orders", { params: { query: { limit: 100 } } }),
);

/** The order, or null when it does not exist or belongs to another account. */
export const getOrder = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<Order | null> => {
    try {
      return await api.get("/console/orders/{id}", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

/** The account's billing profile, or null until someone sets it. */
export const getBillingProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<BillingProfile | null> => {
    try {
      return await api.get("/console/billing-profile");
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
);

/** The account's subscription, or null without one. */
export const getSubscription = createServerFn({ method: "GET" }).handler(
  async (): Promise<Subscription | null> => {
    try {
      return await api.get("/console/subscription");
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
);

export type BillingResult = { ok: true } | { ok: false; message: string };

export type OrderResult = { ok: true; order: Order } | { ok: false; message: string };

const messages: Record<string, string> = {
  organization_role_forbidden:
    "Solo los dueños y administradores de la organización pueden comprar y cambiar la facturación.",
  impersonation_forbidden: "Las compras y la facturación las cambia la persona de la cuenta.",
  account_suspended: "La cuenta está suspendida: no se pueden hacer compras ni cambios.",
  customer_identification_invalid: "El número de identificación no tiene un formato válido.",
  customer_check_digit_invalid: "El dígito de verificación del NIT no corresponde.",
  billing_profile_required: "Completa el perfil de facturación antes de comprar.",
  plan_version_not_offered: "Ese producto cambió o ya no está a la venta. Recarga la página.",
  plan_not_purchasable: "Ese producto no se puede comprar desde la consola.",
  plan_requires_product: "Las recargas solo se compran con un paquete anual vigente.",
  subscription_active:
    "La cuenta ya tiene una suscripción: su excedente reemplaza a los paquetes y las recargas. Para cambiar de plan, prográmalo desde Facturación.",
  subscription_ending:
    "La suscripción termina con este periodo. Reanúdala antes de cambiar de plan.",
  payments_not_configured: "Los pagos no están disponibles en este momento. Intenta más tarde.",
};

/** A refusal of the API, explained; an outage or a server error is thrown. */
function refusal(error: unknown, fallback: string): { ok: false; message: string } {
  if (
    error instanceof CetusApiError &&
    ((error.status >= 400 && error.status < 500) || error.status === 503)
  ) {
    return { ok: false, message: messages[error.code] ?? fallback };
  }
  throw error;
}

export const saveBillingProfile = createServerFn({ method: "POST" })
  .validator(type({ profile: billingProfileSchema, extras: customerExtrasSchema }))
  .handler(async ({ data }): Promise<BillingResult> => {
    try {
      await api.put("/console/billing-profile", {
        body: toCustomerRequest(data.profile, data.extras),
      });
      return { ok: true };
    } catch (error) {
      return refusal(error, "No pudimos guardar el perfil de facturación.");
    }
  });

/** Places the order; the browser then goes to Wompi's checkout, and only Wompi confirms the payment. */
export const createOrder = createServerFn({ method: "POST" })
  .validator(type({ planVersionId: "string.uuid" }))
  .handler(async ({ data }): Promise<OrderResult> => {
    try {
      const order = await api.post("/console/orders", {
        body: { planVersionId: data.planVersionId },
      });
      return { ok: true, order };
    } catch (error) {
      return refusal(error, "No pudimos crear la orden.");
    }
  });

/** A short-lived URL to a file of the order's invoice, or why there is none yet. */
export const getOrderInvoiceFileUrl = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid", file: "'xml' | 'pdf' | 'attached-document'" }))
  .handler(async ({ data }): Promise<DocumentFileUrl> => {
    try {
      const { url } = await api.get("/console/orders/{id}/invoice/files/{file}", {
        params: { path: { id: data.id, file: data.file satisfies DocumentFile } },
      });
      return { url };
    } catch (error) {
      if (error instanceof CetusApiError && error.code === "file_not_available") {
        return { url: null, message: "La factura todavía no está disponible." };
      }
      throw error;
    }
  });

export type SubscriptionResult =
  | { ok: true; subscription: Subscription }
  | { ok: false; message: string };

/** How much overage a period may run up, in COP cents; credit notes always go through. */
export const setOverageLimit = createServerFn({ method: "POST" })
  .validator(type({ overageLimitCents: "0 <= number.integer <= 100000000000" }))
  .handler(async ({ data }): Promise<SubscriptionResult> => {
    try {
      const subscription = await api.put("/console/subscription/overage-limit", {
        body: { overageLimitCents: data.overageLimitCents },
      });
      return { ok: true, subscription };
    } catch (error) {
      return refusal(error, "No pudimos cambiar el límite de excedente.");
    }
  });

/** The plan of the next period; null keeps the current one. */
export const schedulePlanNext = createServerFn({ method: "POST" })
  .validator(type({ planVersionId: "string.uuid | null" }))
  .handler(async ({ data }): Promise<SubscriptionResult> => {
    try {
      const subscription = await api.put("/console/subscription/plan-next", {
        body: { planVersionId: data.planVersionId },
      });
      return { ok: true, subscription };
    } catch (error) {
      return refusal(error, "No pudimos programar el cambio de plan.");
    }
  });

/** Ends the subscription with the open period, or keeps it renewing. */
export const setCancellation = createServerFn({ method: "POST" })
  .validator(type({ cancel: "boolean" }))
  .handler(async ({ data }): Promise<SubscriptionResult> => {
    try {
      const subscription = data.cancel
        ? await api.post("/console/subscription/cancellation")
        : await api.delete("/console/subscription/cancellation");
      return { ok: true, subscription };
    } catch (error) {
      return refusal(error, "No pudimos cambiar la cancelación de la suscripción.");
    }
  });
