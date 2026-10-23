import { type } from "arktype";

export const contactCategory = type("'TECHNICAL' | 'FISCAL' | 'BILLING'");

/** Shared by the change form and the server function that receives it. */
export const changeContactSchema = type({
  "+": "delete",
  email: type("string.trim").to(
    type("string.email").configure({
      message: "Escribe un correo válido, por ejemplo facturacion@empresa.com.",
    }),
  ),
});
