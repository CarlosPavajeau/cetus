import { type } from "arktype";

/** Shared by the creation form and the server function that receives it. */
export const createWebhookEndpointSchema = type({
  "+": "delete",
  url: type("string.trim |> string.url").configure({
    message: "Escribe una URL completa, por ejemplo https://erp.example.com/cetus.",
  }),
  environment: "'TEST' | 'LIVE'",
  description: type("string <= 200").configure({
    message: "Escribe una descripción de hasta 200 caracteres.",
  }),
  eventTypes: "string[]",
});
