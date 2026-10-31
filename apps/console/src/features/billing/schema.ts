import { customerFormSchema } from "~/features/issuance/schema";

/** The billing profile is the customer of Cetus' invoices, whose email is where they go. */
export const billingProfileSchema = customerFormSchema.narrow((profile, ctx) =>
  profile.email === ""
    ? ctx.reject({ path: ["email"], message: "Escribe el correo donde recibirás las facturas." })
    : true,
);
