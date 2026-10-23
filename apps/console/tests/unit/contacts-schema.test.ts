import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import { changeContactSchema } from "~/features/contacts/schema";

describe("changeContactSchema", () => {
  it("trims the address", () => {
    expect(changeContactSchema({ email: "  contador@empresa.com " })).toEqual({
      email: "contador@empresa.com",
    });
  });

  it("refuses what is not an address", () => {
    const result = changeContactSchema({ email: "contador" });
    expect(result).toBeInstanceOf(type.errors);
    expect(result instanceof type.errors && result.summary).toContain("Escribe un correo válido");
  });
});
