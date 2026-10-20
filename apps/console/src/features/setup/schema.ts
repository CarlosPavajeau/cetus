import { type } from "arktype";

// One schema per step of the assistant, shared by its form and the server function that receives it.

const required = (message: string) => type("string > 0").configure({ message });

const isoDate = type(/^\d{4}-\d{2}-\d{2}$/).configure({ message: "Selecciona una fecha." });

export const issuerSchema = type({
  "+": "delete",
  legalName: required("Escribe el nombre o la razón social del RUT."),
  "tradeName?": "string | null",
  nit: type(/^\d{5,15}$/).configure({
    message: "Escribe el NIT sin dígito de verificación: de 5 a 15 números.",
  }),
  personType: "'NATURAL_PERSON' | 'LEGAL_ENTITY'",
  // As written in the RUT, e.g. "O-13, O-15". The server function splits them.
  taxLevelCodes: type(/^\s*[A-Za-z0-9-]+(\s*[,;]\s*[A-Za-z0-9-]+)*\s*$/).configure({
    message: "Escribe los códigos separados por comas, por ejemplo O-13, O-15.",
  }),
  responsibleForIva: "boolean",
  line: required("Escribe la dirección."),
  postalCode: type(/^\d{6}$/).configure({ message: "El código postal tiene 6 números." }),
  departmentCode: required("Selecciona el departamento."),
  departmentName: "string",
  municipalityCode: required("Selecciona el municipio."),
  cityName: "string",
  email: type("string.email").configure({ message: "Escribe un correo válido." }),
  phone: type(/^[0-9+() -]{0,20}$/).configure({ message: "Escribe solo números." }),
});

export type IssuerValues = typeof issuerSchema.infer;

export const softwareSchema = type({
  "+": "delete",
  softwareId: type("string.uuid").configure({
    message: "Pega el Software ID completo, como aparece en el portal de la DIAN.",
  }),
  // Empty when the software is already configured and the PIN is kept.
  pin: "string",
  // Only habilitación has a test set, and only until it is accepted: empty once it is done.
  testSetId: type("string.uuid | ''").configure({
    message: "Pega el TestSetId completo, como aparece en el portal de la DIAN.",
  }),
});

export type SoftwareValues = typeof softwareSchema.infer;

export const certificateSchema = type({
  "+": "delete",
  fileName: "string",
  pkcs12Base64: required("Selecciona tu archivo .p12."),
  password: required("Escribe la contraseña del certificado."),
});

export type CertificateValues = typeof certificateSchema.infer;

const rangeNumber = type(/^\d{1,15}$/).configure({ message: "Escribe solo números." });

export const numberingSchema = type({
  "+": "delete",
  resolutionNumber: type(/^\d{1,20}$/).configure({
    message: "Escribe el número de la resolución.",
  }),
  resolutionDate: isoDate,
  prefix: type(/^[A-Za-z0-9]{0,4}$/).configure({
    message: "El prefijo tiene hasta 4 letras o números.",
  }),
  from: rangeNumber,
  to: rangeNumber,
  validFrom: isoDate,
  validTo: isoDate,
  technicalKey: required("Pega la clave técnica de la resolución."),
}).narrow((range, ctx) => {
  if (Number(range.from) > Number(range.to)) {
    return ctx.reject({ path: ["to"], message: "Debe ser mayor o igual al número inicial." });
  }
  // ISO dates compare correctly as text.
  if (range.validFrom > range.validTo) {
    return ctx.reject({ path: ["validTo"], message: "Debe ser posterior a la fecha inicial." });
  }
  return true;
});

export type NumberingValues = typeof numberingSchema.infer;
