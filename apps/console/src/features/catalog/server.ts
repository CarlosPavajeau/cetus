import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import {
  customerExtrasSchema,
  customerFormSchema,
  toCustomerRequest,
} from "~/features/issuance/schema";
import { CetusApiError, api } from "~/lib/api/client";
import type { CustomerPage, ProductPage } from "~/lib/api/types";

import { productSchema, searchLengthMax, toProductRequest } from "./schema";

const environment = type("'SANDBOX' | 'TEST' | 'LIVE'");

/** A page of a catalog, newest first; {@code q} searches it on the server, so no entry is out of reach. */
const catalogPage = type({
  environment,
  "q?": type.string.atMostLength(searchLengthMax).or("undefined"),
  "before?": "string.uuid | undefined",
  limit: "1 <= number.integer <= 100",
});

export type CatalogPageRequest = typeof catalogPage.infer;

export const listCustomers = createServerFn({ method: "GET" })
  .validator(catalogPage)
  .handler(({ data }): Promise<CustomerPage> =>
    api.get("/console/customers", { params: { query: data } }),
  );

export const listProducts = createServerFn({ method: "GET" })
  .validator(catalogPage)
  .handler(({ data }): Promise<ProductPage> =>
    api.get("/console/products", { params: { query: data } }),
  );

export const deleteCustomer = createServerFn({ method: "POST" })
  .validator(type({ environment, id: "string.uuid" }))
  .handler(async ({ data }) => {
    await api.delete("/console/customers/{id}", {
      params: { path: { id: data.id }, query: { environment: data.environment } },
    });
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .validator(type({ environment, id: "string.uuid" }))
  .handler(async ({ data }) => {
    await api.delete("/console/products/{id}", {
      params: { path: { id: data.id }, query: { environment: data.environment } },
    });
  });

export type SaveResult = { ok: true } | { ok: false; message: string };

const messages: Record<string, string> = {
  customer_exists: "Ya tienes un cliente con ese documento.",
  customer_identification_invalid: "El número de identificación no tiene un formato válido.",
  customer_check_digit_invalid: "El dígito de verificación del NIT no corresponde.",
  product_exists: "Ya tienes un producto con ese código.",
  account_suspended: "La cuenta está suspendida: no se pueden hacer cambios.",
};

/** An answer of the API, explained; an outage or a server error is thrown. */
async function save(call: () => Promise<unknown>, gone: string, fallback: string) {
  try {
    await call();
    return { ok: true } satisfies SaveResult;
  } catch (error) {
    if (error instanceof CetusApiError && error.status >= 400 && error.status < 500) {
      const message = error.status === 404 ? gone : (messages[error.code] ?? fallback);
      return { ok: false, message } satisfies SaveResult;
    }
    throw error;
  }
}

export const createCustomer = createServerFn({ method: "POST" })
  .validator(type({ environment, customer: customerFormSchema }))
  .handler(({ data }): Promise<SaveResult> =>
    save(
      () =>
        api.post("/console/customers", {
          params: { query: { environment: data.environment } },
          body: toCustomerRequest(data.customer, null),
        }),
      "Ese cliente ya no existe.",
      "No pudimos guardar el cliente.",
    ),
  );

/** Saves the customer's form; what the form does not show travels in {@code extras}, so it is kept. */
export const updateCustomer = createServerFn({ method: "POST" })
  .validator(
    type({
      environment,
      id: "string.uuid",
      customer: customerFormSchema,
      extras: customerExtrasSchema,
    }),
  )
  .handler(({ data }): Promise<SaveResult> =>
    save(
      () =>
        api.put("/console/customers/{id}", {
          params: { path: { id: data.id }, query: { environment: data.environment } },
          body: toCustomerRequest(data.customer, data.extras),
        }),
      "Ese cliente ya no existe.",
      "No pudimos guardar el cliente.",
    ),
  );

export const createProduct = createServerFn({ method: "POST" })
  .validator(type({ environment, product: productSchema }))
  .handler(({ data }): Promise<SaveResult> =>
    save(
      () =>
        api.post("/console/products", {
          params: { query: { environment: data.environment } },
          body: toProductRequest(data.product, null),
        }),
      "Ese producto ya no existe.",
      "No pudimos guardar el producto.",
    ),
  );

export const updateProduct = createServerFn({ method: "POST" })
  .validator(
    type({ environment, id: "string.uuid", unitCode: /^[0-9A-Z]{1,3}$/, product: productSchema }),
  )
  .handler(({ data }): Promise<SaveResult> =>
    save(
      () =>
        api.put("/console/products/{id}", {
          params: { path: { id: data.id }, query: { environment: data.environment } },
          body: toProductRequest(data.product, data.unitCode),
        }),
      "Ese producto ya no existe.",
      "No pudimos guardar el producto.",
    ),
  );
