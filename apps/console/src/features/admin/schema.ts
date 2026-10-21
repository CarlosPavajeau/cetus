import { type } from "arktype";

export const accountStatuses = ["ACTIVE", "SUSPENDED", "CLOSED"] as const;
export type AccountStatus = (typeof accountStatuses)[number];

/** Suspending or reactivating says why; the account's members read the reason in their console. */
export const statusChangeSchema = type({
  reason: type("string.trim").to(
    type("3 <= string <= 500").configure({
      message: "Escribe el motivo (entre 3 y 500 caracteres).",
    }),
  ),
});
