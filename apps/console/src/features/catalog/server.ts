import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

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

const productMessages: Record<string, string> = {
  product_exists: "Ya tienes un producto con ese código.",
  account_suspended: "La cuenta está suspendida: no se pueden hacer cambios.",
};

export const createProduct = createServerFn({ method: "POST" })
  .validator(type({ environment, product: productSchema }))
  .handler(async ({ data }): Promise<SaveResult> => {
    try {
      await api.post("/console/products", {
        params: { query: { environment: data.environment } },
        body: toProductRequest(data.product),
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof CetusApiError && error.status >= 400 && error.status < 500) {
        return {
          ok: false,
          message: productMessages[error.code] ?? "No pudimos guardar el producto.",
        };
      }
      throw error;
    }
  });
