import { type Traversal, type } from "arktype";

const email = type("string.email").configure({ message: "Ingresa un correo válido." });

/** Trims the value and rejects it when nothing is left. */
const required = (message: string) =>
  type("string.trim").to(type("string > 0").configure({ message }));

export const signInSchema = type({
  email,
  password: type("string > 0").configure({ message: "Ingresa tu contraseña." }),
});

const newPassword = {
  // Better Auth's own limits (minPasswordLength, and maxPasswordLength by default).
  password: type("10 <= string <= 128").configure({
    message: "La contraseña debe tener entre 10 y 128 caracteres.",
  }),
  confirmPassword: type("string > 0").configure({ message: "Repite tu contraseña." }),
};

const passwordsMatch = (values: { password: string; confirmPassword: string }, ctx: Traversal) =>
  values.password === values.confirmPassword
    ? true
    : ctx.reject({ path: ["confirmPassword"], message: "Las contraseñas no coinciden." });

/** A checkbox the person must tick: the form starts with it unticked. */
export const acceptedLegal = type("boolean")
  .narrow((accepted) => accepted)
  .configure({ message: "Acepta los términos y la política de datos para continuar." });

export const signUpSchema = type({
  name: required("Escribe tu nombre completo."),
  email,
  ...newPassword,
  acceptedLegal,
}).narrow(passwordsMatch);

export const forgotPasswordSchema = type({ email });

export const resetPasswordSchema = type(newPassword).narrow(passwordsMatch);

const trustDevice = type("boolean");

export const totpCodeSchema = type({
  code: type("string.trim").to(
    type(/^\d{6}$/).configure({ message: "El código tiene 6 dígitos." }),
  ),
  trustDevice,
});

export const backupCodeSchema = type({
  code: type("string.trim")
    .to(
      type(/^[a-zA-Z0-9]{10}$/).configure({
        message: "El código de respaldo tiene 10 caracteres.",
      }),
    )
    // Better Auth stores and compares the code with the dash between its halves.
    .pipe((code) => `${code.slice(0, 5)}-${code.slice(5)}`),
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
