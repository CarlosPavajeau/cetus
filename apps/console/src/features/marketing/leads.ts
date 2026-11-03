import { type } from "arktype";

/**
 * The API's own pattern: stricter than an email check, since "Avísame" addresses go into the email provider's
 * URLs. Kept the same so the form says what is wrong instead of the API refusing it.
 */
const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const leadEmail = type("string.trim").to(
  type(emailPattern).configure({
    message: "Escribe un correo válido, por ejemplo nombre@empresa.com.",
  }),
);

/** Never checked beforehand: the authorization has to be the person's own act. */
export const leadConsent = type("boolean")
  .narrow((checked) => checked)
  .configure({ message: "Para escribirte necesitamos tu autorización." });

/**
 * Left empty by people: hidden from view and from assistive technology. A bot that fills every field gets a
 * success and nothing is sent.
 */
export const leadTrap = type("string");

/** What every lead form asks: where to write and the authorization to do it. */
export const leadContactSchema = type({
  email: leadEmail,
  consent: leadConsent,
  website: leadTrap,
});

export type LeadContactValues = typeof leadContactSchema.inferIn;

export const emptyLeadContact: LeadContactValues = { email: "", consent: false, website: "" };

export type LeadResult = { ok: true } | { ok: false; message: string };
