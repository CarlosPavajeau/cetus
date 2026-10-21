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
  name: required("Escribe tu nombre completo."),
  email,
  password: type("string >= 10").configure({
    message: "La contraseña debe tener mínimo 10 caracteres.",
  }),
  confirmPassword: type("string > 0").configure({ message: "Repite tu contraseña." }),
}).narrow((values, ctx) =>
  values.password === values.confirmPassword
    ? true
    : ctx.reject({ path: ["confirmPassword"], message: "Las contraseñas no coinciden." }),
);

const trustDevice = type("boolean");

export const totpCodeSchema = type({
  code: type("string.trim").to(
    type(/^\d{6}$/).configure({ message: "El código tiene 6 dígitos." }),
  ),
  trustDevice,
});

export const backupCodeSchema = type({
  code: required("Escribe un código de respaldo."),
  trustDevice,
});

export const enableTwoFactorSchema = type({
  password: type("string > 0").configure({ message: "Ingresa tu contraseña." }),
});

export const verifyTotpSchema = type({
  code: type("string.trim").to(
    type(/^\d{6}$/).configure({ message: "El código tiene 6 dígitos." }),
  ),
});
