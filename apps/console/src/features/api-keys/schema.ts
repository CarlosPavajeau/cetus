import { type } from "arktype";

/** Shared by the creation form and the server function that receives it. */
export const createApiKeySchema = type({
  "+": "delete",
  name: type("0 < string <= 80").configure({
    message: "Escribe un nombre de hasta 80 caracteres.",
  }),
  environment: "'TEST' | 'LIVE'",
});
