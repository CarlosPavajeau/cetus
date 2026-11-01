import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import { softwareSchema } from "~/features/setup/schema";

const software = (pin: string) => ({ softwareId: crypto.randomUUID(), pin, testSetId: "" });

describe("softwareSchema", () => {
  it("takes the five digits the DIAN portal asks for", () => {
    expect(softwareSchema(software("12345"))).not.toBeInstanceOf(type.errors);
  });

  it("takes an empty PIN, which keeps the saved one", () => {
    expect(softwareSchema(software(""))).not.toBeInstanceOf(type.errors);
  });

  it.each(["1234", "123456", "12a45"])("refuses %s as a PIN", (pin) => {
    const result = softwareSchema(software(pin));
    expect(result).toBeInstanceOf(type.errors);
    expect(result instanceof type.errors && result.summary).toContain("El PIN tiene 5 números");
  });
});
