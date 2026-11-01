import { type } from "arktype";

import { customerFormSchema } from "~/features/issuance/schema";

/** The billing profile is the customer of Cetus' invoices, whose email is where they go. */
export const billingProfileSchema = customerFormSchema.narrow((profile, ctx) =>
  profile.email === ""
    ? ctx.reject({ path: ["email"], message: "Escribe el correo donde recibirás las facturas." })
    : true,
);

/** The overage limit in whole pesos, as people write it; the API takes cents. */
export const overageLimitSchema = type({
  pesos: type("string.trim").to(
    type("string.integer.parse")
      .to("0 <= number <= 1000000000")
      .configure({ message: "Escribe un valor en pesos, sin decimales, entre 0 y 1.000.000.000." }),
  ),
});

const digits = (text: string) => text.replace(/[\s-]/g, "");

/** The Luhn check every card number passes, to catch a mistyped digit before Wompi does. */
function luhn(number: string) {
  let sum = 0;
  for (let index = 0; index < number.length; index++) {
    let digit = Number(number[number.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

type Expiry = { month: string; year: string };

/** "08/29", "0829" or "8/29" → { month: "08", year: "29" }; null for anything else. */
function expiryOf(text: string): Expiry | null {
  const [, monthText, year] = /^\s*(\d{1,2})\s*\/?\s*(\d{2})\s*$/.exec(text) ?? [];
  if (
    monthText === undefined ||
    year === undefined ||
    (monthText.length === 1 && !text.includes("/"))
  ) {
    return null;
  }
  const month = Number(monthText);
  return month >= 1 && month <= 12 ? { month: monthText.padStart(2, "0"), year } : null;
}

/** A card works through the last day of its month. */
function expired(expiry: Expiry, today: Date) {
  const year = 2000 + Number(expiry.year);
  const month = Number(expiry.month);
  return year * 12 + month < today.getFullYear() * 12 + today.getMonth() + 1;
}

/**
 * The card as the person writes it, only ever sent to Wompi from the browser. The expiry is MM/AA, with or without
 * the slash; both of Wompi's documents must be accepted.
 */
export const cardFormSchema = type({
  number: type("string")
    .pipe(digits)
    .narrow((number, ctx) =>
      /^\d{13,19}$/.test(number) && luhn(number)
        ? true
        : ctx.reject({ message: "Escribe el número completo de la tarjeta." }),
    ),
  expiry: type("string")
    .pipe(expiryOf)
    .narrow((expiry, ctx) =>
      expiry !== null ? true : ctx.reject({ message: "Escribe el vencimiento como MM/AA." }),
    )
    .narrow((expiry, ctx) =>
      expiry === null || !expired(expiry, new Date())
        ? true
        : ctx.reject({ message: "La tarjeta ya venció. Usa otra tarjeta." }),
    )
    .pipe((expiry) => ({ month: expiry?.month ?? "", year: expiry?.year ?? "" })),
  cvc: type("string.trim").narrow((cvc, ctx) =>
    /^\d{3,4}$/.test(cvc) ? true : ctx.reject({ message: "Escribe los 3 o 4 dígitos del código." }),
  ),
  holder: type("string.trim").narrow((holder, ctx) =>
    holder.length >= 5
      ? true
      : ctx.reject({ message: "Escribe el nombre como aparece en la tarjeta." }),
  ),
  terms: type("boolean")
    .narrow((accepted) => accepted)
    .configure({ message: "Acepta los términos de Wompi para guardar la tarjeta." }),
  personalData: type("boolean")
    .narrow((accepted) => accepted)
    .configure({ message: "Autoriza el tratamiento de datos para guardar la tarjeta." }),
});

export type CardForm = typeof cardFormSchema.infer;
