import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders, getRequestIP } from "@tanstack/react-start/server";
import { type } from "arktype";

import { auth } from "~/lib/auth/server";

import { consentOrigin, recordConsents } from "./consents";
import { legalAcceptance } from "./documents";

/** The signed-in person accepts the documents they were shown, named as in `legalAcceptance`. */
export const acceptLegal = createServerFn({ method: "POST" })
  .validator(type({ acceptance: "string" }))
  .handler(async ({ data }) => {
    const headers = new Headers(getRequestHeaders());
    const session = await auth.api.getSession({ headers });
    if (!session) {
      throw new Error("Inicia sesión para aceptar los documentos.");
    }
    // Staff seeing the console as someone else cannot accept on their behalf.
    if (session.session.impersonatedBy) {
      throw new Error("Esta acción no está disponible mientras ves la consola como otra persona.");
    }
    if (data.acceptance !== legalAcceptance) {
      throw new Error("Los documentos cambiaron mientras los leías. Recarga la página.");
    }
    await recordConsents(session.user.id, consentOrigin(headers, getRequestIP()));
  });
