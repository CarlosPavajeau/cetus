import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api, publicApi } from "~/lib/api/client";
import type { ContactVerification } from "~/lib/api/types";

import { changeContactSchema, contactCategory } from "./schema";

export const listContacts = createServerFn({ method: "GET" }).handler(() =>
  api.get("/console/contacts"),
);

const messages: Record<string, string> = {
  verification_recently_sent:
    "Acabamos de enviar un correo de verificación. Espera un minuto antes de pedir otro.",
  no_pending_change: "Este contacto no tiene un cambio pendiente.",
  impersonation_forbidden: "Los contactos solo los cambia la persona dueña de la cuenta.",
  account_suspended: "La cuenta está suspendida: no se pueden hacer cambios.",
};

function toUserError(error: unknown): unknown {
  if (error instanceof CetusApiError && messages[error.code]) {
    return new Error(messages[error.code], { cause: error });
  }
  return error;
}

/** Asks to move the category to a new address; it takes effect once the address is verified. */
export const changeContact = createServerFn({ method: "POST" })
  .validator(type({ category: contactCategory, contact: changeContactSchema }))
  .handler(async ({ data }) => {
    try {
      return await api.put("/console/contacts/{category}", {
        params: { path: { category: data.category } },
        body: { email: data.contact.email },
      });
    } catch (error) {
      throw toUserError(error);
    }
  });

export const resendContactVerification = createServerFn({ method: "POST" })
  .validator(type({ category: contactCategory }))
  .handler(async ({ data }) => {
    try {
      return await api.post("/console/contacts/{category}/verification", {
        params: { path: { category: data.category } },
      });
    } catch (error) {
      throw toUserError(error);
    }
  });

export const cancelContactChange = createServerFn({ method: "POST" })
  .validator(type({ category: contactCategory }))
  .handler(async ({ data }) => {
    try {
      return await api.delete("/console/contacts/{category}/pending", {
        params: { path: { category: data.category } },
      });
    } catch (error) {
      throw toUserError(error);
    }
  });

const token = type(/^[A-Za-z0-9_-]{43}$/);

/** What the link verifies, or null when it cannot be used anymore. No session: the token is the credential. */
export const getContactVerification = createServerFn({ method: "GET" })
  .validator(type({ token: "string" }))
  .handler(async ({ data }): Promise<ContactVerification | null> => {
    if (!token.allows(data.token)) {
      return null;
    }
    try {
      return await publicApi.get("/console/contact-verifications/{token}", {
        params: { path: { token: data.token } },
      });
    } catch (error) {
      if (error instanceof CetusApiError && (error.status === 404 || error.status === 400)) {
        return null;
      }
      throw error;
    }
  });

export const confirmContactVerification = createServerFn({ method: "POST" })
  .validator(type({ token }))
  .handler(async ({ data }) => {
    try {
      return await publicApi.post("/console/contact-verifications/{token}", {
        params: { path: { token: data.token } },
      });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        throw new Error("Este enlace ya no es válido: venció, ya se usó o se pidió uno nuevo.", {
          cause: error,
        });
      }
      throw error;
    }
  });
