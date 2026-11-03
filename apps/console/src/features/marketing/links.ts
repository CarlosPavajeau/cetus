import { invitationSearch } from "~/features/auth/session-start";

/** Who the landing speaks to: the developer integrating the API, or the business issuing from the console. */
export type Audience = "dev" | "negocio";

export const audiences: readonly Audience[] = ["dev", "negocio"];

export function parseAudience(value: unknown): Audience | undefined {
  return audiences.find((each) => each === value);
}

/**
 * The search of the sign-up: an invitation, or where the visitor came from (`audience` from the landing, `ref`
 * from the docs or a campaign) so the start of the funnel can be measured.
 */
export function signUpSearch(search: Record<string, unknown>): {
  invitation?: string;
  audience?: Audience;
  ref?: string;
} {
  const audience = parseAudience(search.audience);
  const ref =
    typeof search.ref === "string" && /^[\w-]{1,40}$/.test(search.ref) ? search.ref : undefined;
  return {
    ...invitationSearch(search),
    ...(audience && { audience }),
    ...(ref && { ref }),
  };
}

export const whatsappMessage = "Hola, quiero empezar a facturar electrónicamente con Cetus.";

export function whatsappUrl(number: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(whatsappMessage)}`;
}
