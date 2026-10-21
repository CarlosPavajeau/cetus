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

/** How long a ban lasts, in days; null bans until someone lifts it. */
export const banDurations = [1, 7, 30] as const;

export const banSchema = statusChangeSchema.and({
  days: type.enumerated(...banDurations, null),
});

export const impersonationSchema = statusChangeSchema.and({
  userId: "0 < string <= 64",
  organizationId: "0 < string <= 64",
});
