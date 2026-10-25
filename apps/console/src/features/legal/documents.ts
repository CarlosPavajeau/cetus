/** Who answers for Cetus in its legal documents. */
export const legalOwner = {
  name: "Carlos Andrés Pavajeau Max",
  taxId: "C.C. 1007870923",
  city: "Valledupar, Cesar",
  address: "Carrera 11 #13B-62, Obrero",
  email: "contact@cantte.com",
} as const;

/**
 * The documents every user accepts, at their current version. Changing a version makes everyone accept that
 * document again before using the console. The data processing agreement is an annex of the terms and shares
 * their version.
 */
export const legalDocuments = {
  terms: { version: "2026-10-24", title: "Términos de servicio", path: "/legal/terminos" },
  privacy: {
    version: "2026-10-24",
    title: "Política de tratamiento de datos personales",
    path: "/legal/privacidad",
  },
} as const;

export type LegalDocument = keyof typeof legalDocuments;

export const legalDocumentNames: readonly LegalDocument[] = ["terms", "privacy"];

/**
 * What a sign-up or a new acceptance names to accept: every document at the version the person was shown. A page
 * opened before a change names an older one, and cannot accept a text it never showed.
 */
export const legalAcceptance = legalDocumentNames
  .map((name) => `${name}@${legalDocuments[name].version}`)
  .join(",");

/** The header in which the sign-up form sends `legalAcceptance`: Better Auth's client types its body. */
export const legalAcceptanceHeader = "X-Cetus-Legal-Acceptance";

/** The documents whose current version is not among the accepted ones. */
export function pendingConsents(
  accepted: readonly { document: string; version: string }[],
): LegalDocument[] {
  return legalDocumentNames.filter(
    (name) =>
      !accepted.some(
        (consent) => consent.document === name && consent.version === legalDocuments[name].version,
      ),
  );
}

/** "12 de octubre de 2026" from a version "2026-10-12". */
export function versionDate(version: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${version}T00:00:00Z`),
  );
}
