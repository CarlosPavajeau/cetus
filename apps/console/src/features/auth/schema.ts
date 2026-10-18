import { type } from "arktype";

const email = type("string.email").configure({ message: "Ingresa un correo válido." });

/** Trims the value and rejects it when nothing is left. */
const required = (message: string) =>
  type("string.trim").to(type("string > 0").configure({ message }));

export const signInSchema = type({
  email,
  password: type("string > 0").configure({ message: "Ingresa tu contraseña." }),
});

export const signUpSchema = type({
  name: required("Escribe tu nombre."),
  company: required("Escribe el nombre de la empresa."),
  email,
  password: type("string >= 10").configure({
    message: "La contraseña debe tener mínimo 10 caracteres.",
  }),
});
