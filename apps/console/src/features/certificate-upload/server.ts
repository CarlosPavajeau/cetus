import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, publicApi } from "~/lib/api/client";
import type { CertificateUploadLink } from "~/lib/api/types";

import { certificateSchema } from "../setup/schema";
import { toUserError } from "../setup/server-helpers";

const token = type(/^[A-Za-z0-9_-]{43}$/);

const invalidLink = "Este enlace ya no es válido: venció, ya se usó o se generó uno nuevo.";

/** What the link is for, or null when it cannot be used anymore. No session: the token is the credential. */
export const getCertificateUploadLink = createServerFn({ method: "GET" })
  .validator(type({ token: "string" }))
  .handler(async ({ data }): Promise<CertificateUploadLink | null> => {
    if (!token.allows(data.token)) {
      return null;
    }
    try {
      return await publicApi.get("/console/certificate-uploads/{token}", {
        params: { path: { token: data.token } },
      });
    } catch (error) {
      if (error instanceof CetusApiError && (error.status === 404 || error.status === 400)) {
        return null;
      }
      throw error;
    }
  });

export const uploadCertificateWithLink = createServerFn({ method: "POST" })
  .validator(type({ token, certificate: certificateSchema }))
  .handler(async ({ data }) => {
    try {
      return await publicApi.put("/console/certificate-uploads/{token}", {
        params: { path: { token: data.token } },
        body: {
          pkcs12Base64: data.certificate.pkcs12Base64,
          password: data.certificate.password,
        },
      });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        throw new Error(invalidLink, { cause: error });
      }
      if (error instanceof CetusApiError && error.code === "account_suspended") {
        throw new Error("La cuenta está suspendida. Escríbenos a soporte.", { cause: error });
      }
      // The certificate's own errors (wrong password, expired) get the assistant's messages.
      throw toUserError(error);
    }
  });
