import { type } from "arktype";

import { statusChangeSchema } from "./schema";

/** Every change to an order says why; it stays in the audit log. */
export const reasonSchema = statusChangeSchema;

export const reversalModes = ["WOMPI", "EXTERNAL"] as const;

export const refundSchema = reasonSchema.and({
  amountPesos: type("number > 0").configure({ message: "Escribe un monto mayor que cero." }),
  mode: type.enumerated(...reversalModes),
});

/** The order action dialog's form: the amount and the mode only matter to a refund, the outcome to a resolution. */
export const orderActionSchema = reasonSchema.and({
  amountPesos: "number",
  mode: type.enumerated(...reversalModes),
  approved: "'true' | 'false'",
});
