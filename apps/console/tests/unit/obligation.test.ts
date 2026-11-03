import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import { leadContactSchema } from "~/features/marketing/leads";
import { assessObligation, capLabel } from "~/features/marketing/obligation";
import type { ObligationAnswer } from "~/lib/api/types";

function natural(
  simpleRegime: ObligationAnswer,
  incomeOverCap: ObligationAnswer,
  severalEstablishments: ObligationAnswer,
  otherConditions: ObligationAnswer,
) {
  return {
    personType: "NATURAL_PERSON",
    simpleRegime,
    incomeOverCap,
    severalEstablishments,
    otherConditions,
  } as const;
}

describe("assessObligation", () => {
  it("obligates a legal entity", () => {
    expect(assessObligation({ personType: "LEGAL_ENTITY" })).toBe("OBLIGATED");
  });

  it("frees a natural person meeting every condition", () => {
    expect(assessObligation(natural("NO", "NO", "NO", "NO"))).toBe("NOT_OBLIGATED");
  });

  it("obligates on any yes, even next to an unknown", () => {
    expect(assessObligation(natural("UNKNOWN", "NO", "YES", "NO"))).toBe("OBLIGATED");
  });

  it("asks for a review on an unknown without a yes", () => {
    expect(assessObligation(natural("NO", "UNKNOWN", "NO", "NO"))).toBe("REVIEW");
  });
});

describe("capLabel", () => {
  it("shows the cap in pesos once the API knows the UVT", () => {
    expect(capLabel({ uvt: 3500, uvtValueCop: 50_000 }).replaceAll(/\s/g, " ")).toBe(
      "3.500 UVT ($ 175.000.000)",
    );
  });

  it("falls back to the UVT alone", () => {
    expect(capLabel(null)).toBe("3.500 UVT");
  });
});

describe("leadContactSchema", () => {
  it("takes a trimmed address with the authorization", () => {
    expect(leadContactSchema({ email: " ana@empresa.com ", consent: true, website: "" })).toEqual({
      email: "ana@empresa.com",
      consent: true,
      website: "",
    });
  });

  it("needs the authorization", () => {
    const result = leadContactSchema({ email: "ana@empresa.com", consent: false, website: "" });
    expect(result instanceof type.errors && result.summary).toContain(
      "necesitamos tu autorización",
    );
  });

  it("refuses an address the API would not take", () => {
    const result = leadContactSchema({ email: "ana@empresa?.com", consent: true, website: "" });
    expect(result instanceof type.errors && result.summary).toContain("Escribe un correo válido");
  });
});
