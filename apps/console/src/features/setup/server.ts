import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { api } from "~/lib/api/client";

import { certificateSchema, issuerSchema, numberingSchema, softwareSchema } from "./schema";
import type { IssuerValues } from "./schema";
import { call, rangeBody, softwareBody } from "./server-helpers";

/** The form values as the API expects them. Cetus only operates in Colombia. */
function issuerBody(values: IssuerValues) {
  return {
    legalName: values.legalName.trim(),
    tradeName: values.tradeName ?? undefined,
    personType: values.personType,
    taxLevelCodes: values.taxLevelCodes,
    responsibleForIva: values.responsibleForIva,
    address: {
      line: values.line.trim(),
      postalCode: values.postalCode,
      departmentCode: values.departmentCode,
      departmentName: values.departmentName,
      municipalityCode: values.municipalityCode,
      cityName: values.cityName,
      countryCode: "CO",
      countryName: "Colombia",
    },
    email: values.email.trim(),
    phone: values.phone.trim() || undefined,
  };
}

/**
 * Creates the issuer in habilitación (TEST) or, when its software is already enabled at the DIAN,
 * directly in production (LIVE). The environment never changes afterwards.
 */
export const createIssuer = createServerFn({ method: "POST" })
  .validator(type({ environment: "'TEST' | 'LIVE'", issuer: issuerSchema }))
  .handler(({ data }) =>
    call(() =>
      api.post("/console/issuers", {
        body: { ...issuerBody(data.issuer), environment: data.environment, nit: data.issuer.nit },
      }),
    ),
  );

export const updateIssuer = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", issuer: issuerSchema }))
  .handler(({ data }) =>
    call(() =>
      api.put("/console/issuers/{id}", {
        params: { path: { id: data.id } },
        body: issuerBody(data.issuer),
      }),
    ),
  );

export const setSoftware = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", software: softwareSchema }))
  .handler(({ data }) =>
    call(() =>
      api.put("/console/issuers/{id}/software", {
        params: { path: { id: data.id } },
        body: softwareBody(data.software),
      }),
    ),
  );

export const setCertificate = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", certificate: certificateSchema }))
  .handler(({ data }) =>
    call(() =>
      api.put("/console/issuers/{id}/certificate", {
        params: { path: { id: data.id } },
        body: {
          pkcs12Base64: data.certificate.pkcs12Base64,
          password: data.certificate.password,
        },
      }),
    ),
  );

export const addNumberingRange = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", range: numberingSchema }))
  .handler(({ data: { id, range } }) =>
    call(() =>
      api.post("/console/issuers/{id}/numbering-ranges", {
        params: { path: { id } },
        body: rangeBody(range),
      }),
    ),
  );
