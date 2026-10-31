// Used inside server function handlers only: importing them from a module the browser loads would pull
// the API client into the client bundle.
import { CetusApiError } from "~/lib/api/client";

import type { NumberingValues, SoftwareValues } from "./schema";

const messages: Record<string, string> = {
  check_digit_invalid: "El NIT no coincide con su dígito de verificación.",
  certificate_invalid:
    "No pudimos abrir el certificado: revisa que el archivo sea el .p12 original y que la contraseña sea correcta.",
  certificate_expired: "El certificado está vencido. Solicita uno vigente a tu proveedor.",
  range_invalid: "El número inicial debe ser menor o igual al número final.",
  person_type_locked:
    "El tipo de persona viene con el NIT: no cambia una vez configurado el emisor.",
  issuer_already_exists:
    "Ya tienes un emisor con este NIT en este entorno. Búscalo en la lista de emisores.",
  issuer_limit_reached:
    "Tu plan no incluye más emisores en producción. Elige una suscripción o un paquete que incluya más emisores.",
  no_active_product:
    "Para tener emisores en producción necesitas una suscripción o un paquete vigente.",
  invalid_request: "Revisa los datos del formulario: alguno no tiene el formato esperado.",
};

/** An API error as a message the person can act on; other errors pass through. */
export function toUserError(error: unknown): unknown {
  if (error instanceof CetusApiError) {
    return new Error(
      messages[error.code] ??
        (error.status === 404
          ? "No encontramos este emisor. Recarga la página."
          : "No pudimos guardar este paso. Inténtalo de nuevo en unos minutos."),
      { cause: error },
    );
  }
  return error;
}

/** Calls the API and turns its errors into a message the person can act on. */
export async function call<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw toUserError(error);
  }
}

export function softwareBody(software: SoftwareValues) {
  return {
    softwareId: software.softwareId.trim(),
    pin: software.pin.trim(),
    testSetId: software.testSetId.trim() || undefined,
  };
}

/** An invoice range, as the assistant and the administration add it. */
export function rangeBody(range: NumberingValues) {
  return {
    documentType: "INVOICE" as const,
    resolutionNumber: range.resolutionNumber,
    resolutionDate: range.resolutionDate,
    prefix: range.prefix.toUpperCase(),
    from: Number(range.from),
    to: Number(range.to),
    validFrom: range.validFrom,
    validTo: range.validTo,
    technicalKey: range.technicalKey.trim() || undefined,
  };
}
