import { describe, expect, it } from "vite-plus/test";

import { legalAcceptance, legalDocuments, pendingConsents } from "~/features/legal/documents";

describe("pendingConsents", () => {
  it("asks for every document of a user who accepted none", () => {
    expect(pendingConsents([])).toEqual(["terms", "privacy"]);
  });

  it("asks only for a document whose accepted version is not the current one", () => {
    expect(
      pendingConsents([
        { document: "terms", version: "2000-01-01" },
        { document: "privacy", version: legalDocuments.privacy.version },
      ]),
    ).toEqual(["terms"]);
  });

  it("asks for nothing once the current versions are accepted", () => {
    expect(
      pendingConsents([
        { document: "terms", version: legalDocuments.terms.version },
        { document: "privacy", version: legalDocuments.privacy.version },
      ]),
    ).toEqual([]);
  });
});

describe("legalAcceptance", () => {
  it("names every document at its current version", () => {
    expect(legalAcceptance).toBe(
      `terms@${legalDocuments.terms.version},privacy@${legalDocuments.privacy.version}`,
    );
  });
});
