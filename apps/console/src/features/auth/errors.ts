/** The part of a Better Auth client error the forms read. */
export type AuthError = { status: number; code?: string; message?: string };

export const tooManyAttemptsMessage =
  "Demasiados intentos seguidos. Espera unos minutos antes de volver a intentarlo.";

export function signInErrorMessage(error: AuthError): string {
  if (error.status === 429) {
    return tooManyAttemptsMessage;
  }
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.";
    case "BANNED_USER":
      return error.message ?? "Tu acceso a Cetus está bloqueado.";
    default:
      return "No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos; si sigue fallando, escríbenos a contact@cantte.com.";
  }
}

export type SignUpErrorField = "email" | "password" | "acceptedLegal" | "root";

export function signUpError(error: AuthError): { field: SignUpErrorField; message: string } {
  if (error.status === 429) {
    return { field: "root", message: tooManyAttemptsMessage };
  }
  switch (error.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        field: "email",
        message: "Ya hay una cuenta con este correo. Inicia sesión o recupera la contraseña.",
      };
    case "INVALID_EMAIL":
      return { field: "email", message: "Escribe un correo válido, como tu@empresa.com." };
    case "PASSWORD_TOO_SHORT":
    case "PASSWORD_TOO_LONG":
      return { field: "password", message: "La contraseña debe tener entre 10 y 128 caracteres." };
    case "LEGAL_ACCEPTANCE_REQUIRED":
      return {
        field: "acceptedLegal",
        message: "Acepta los términos de servicio y la política de datos para crear la cuenta.",
      };
    default:
      return {
        field: "root",
        message: "No pudimos crear la cuenta. Inténtalo de nuevo en unos minutos.",
      };
  }
}
