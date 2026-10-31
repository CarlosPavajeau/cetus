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
