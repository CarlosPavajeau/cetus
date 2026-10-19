import { type } from "arktype";

const rangeNumber = type(/^\d{1,15}$/).configure({ message: "Escribe solo números." });

/** A range for credit or debit notes: no resolution, only a prefix and consecutive numbers. */
export const noteRangeSchema = type({
  "+": "delete",
  documentType: "'CREDIT_NOTE' | 'DEBIT_NOTE'",
  prefix: type(/^[A-Za-z0-9]{1,4}$/).configure({
    message: "El prefijo tiene de 1 a 4 letras o números.",
  }),
  from: rangeNumber,
  to: rangeNumber,
});

export type NoteRangeValues = typeof noteRangeSchema.infer;
