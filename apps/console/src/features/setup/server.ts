import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";

import { certificateSchema, issuerSchema, numberingSchema, softwareSchema } from "./schema";
import type { IssuerValues } from "./schema";

const messages: Record<string, string> = {
  check_digit_invalid: "El NIT no coincide con su dígito de verificación.",
  certificate_invalid:
    "No pudimos abrir el certificado: revisa que el archivo sea el .p12 original y que la contraseña sea correcta.",
  certificate_expired: "El certificado está vencido. Solicita uno vigente a tu proveedor.",
  range_invalid: "El número inicial debe ser menor o igual al número final.",
  issuer_locked: "Este emisor ya terminó su configuración y no se puede editar desde el asistente.",
  invalid_request: "Revisa los datos del formulario: alguno no tiene el formato esperado.",
};

/** Calls the API and turns its errors into a message the person can act on. */
async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof CetusApiError) {
      throw new Error(
        messages[error.code] ??
          (error.status === 404
            ? "No encontramos este emisor. Recarga la página."
            : "No pudimos guardar este paso. Inténtalo de nuevo en unos minutos."),
        { cause: error },
      );
    }
    throw error;
  }
}

/** The form values as the API expects them. Cetus only operates in Colombia. */
function issuerBody(values: IssuerValues) {
  return {
    legalName: values.legalName.trim(),
    tradeName: values.tradeName ?? undefined,
    personType: values.personType,
    taxLevelCodes: values.taxLevelCodes
      .split(/[,;]/)
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean),
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

/** The assistant always creates the issuer in the test environment (habilitación). */
export const createIssuer = createServerFn({ method: "POST" })
  .validator(issuerSchema)
  .handler(({ data }) =>
    call(() =>
      api.post("/console/issuers", {
        body: { ...issuerBody(data), environment: "TEST", nit: data.nit },
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
        body: {
          softwareId: data.software.softwareId.trim(),
          pin: data.software.pin.trim(),
          testSetId: data.software.testSetId.trim(),
        },
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
        body: {
          documentType: "INVOICE",
          resolutionNumber: range.resolutionNumber,
          resolutionDate: range.resolutionDate,
          prefix: range.prefix.toUpperCase(),
          from: Number(range.from),
          to: Number(range.to),
          validFrom: range.validFrom,
          validTo: range.validTo,
          technicalKey: range.technicalKey.trim(),
        },
      }),
    ),
  );
