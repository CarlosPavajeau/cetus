import { readFileSync } from "node:fs";

import { describe, expect, it } from "vite-plus/test";

import { dianRuleDocsUrl, explanations, parseDianError } from "~/features/documents/dian-errors";

describe("parseDianError", () => {
  it("splits a notification into rule, kind and message, with its explanation", () => {
    const error = parseDianError(
      "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suminstrado.",
    );

    expect(error.rule).toBe("FAJ43b");
    expect(error.kind).toBe("NOTIFICATION");
    expect(error.message).toBe(
      "Nombre informado No corresponde al registrado en el RUT con respecto al Nit suminstrado.",
    );
    expect(error.explanation?.title).toContain("RUT");
  });

  it("recognizes a rejection", () => {
    const error = parseDianError("Regla: 90, Rechazo: Documento procesado anteriormente.");

    expect(error).toMatchObject({ rule: "90", kind: "REJECTION" });
    expect(error.explanation).not.toBeNull();
  });

  it("keeps the DIAN's message for a rule without explanation", () => {
    const error = parseDianError("Regla: ZZZ99, Rechazo: Algo distinto.");

    expect(error).toMatchObject({ rule: "ZZZ99", kind: "REJECTION", message: "Algo distinto." });
    expect(error.explanation).toBeNull();
  });

  it("returns text in another format as is", () => {
    expect(parseDianError("  Error inesperado del servicio ")).toEqual({
      rule: null,
      kind: null,
      message: "Error inesperado del servicio",
      explanation: null,
    });
  });
});

describe("dianRuleDocsUrl", () => {
  it("links to the rule's anchor, which the docs site lowercases", () => {
    expect(dianRuleDocsUrl("FAJ43b")).toBe("https://cetus-docs.cantte.com/errores#faj43b");
  });

  it("has a catalog entry for every explained rule", () => {
    const catalog = readFileSync(
      new URL("../../../docs/content/docs/errores.mdx", import.meta.url),
      "utf8",
    );
    const entries = [...catalog.matchAll(/^### (\S+)$/gm)].map((match) => match[1]);

    expect(entries).toEqual(expect.arrayContaining(Object.keys(explanations)));
  });
});
