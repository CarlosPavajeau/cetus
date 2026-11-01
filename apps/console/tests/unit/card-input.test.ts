import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import {
  cardBrandOf,
  formatCardNumber,
  formatCvc,
  formatExpiry,
} from "~/features/billing/cardInput";
import { cardFormSchema } from "~/features/billing/schema";

const nextYear = String((new Date().getFullYear() + 1) % 100).padStart(2, "0");

const card = {
  number: "4242 4242 4242 4242",
  expiry: `08/${nextYear}`,
  cvc: "123",
  holder: "Prueba Cetus",
  terms: true,
  personalData: true,
};

describe("formatExpiry", () => {
  it("puts the slash in whatever way the expiry is typed", () => {
    expect(formatExpiry("0129")).toBe("01/29");
    expect(formatExpiry("01/29")).toBe("01/29");
    expect(formatExpiry("1/29")).toBe("01/29");
    expect(formatExpiry("012")).toBe("01/2");
  });

  it("reads a first digit above 1 as a month of one digit", () => {
    expect(formatExpiry("3")).toBe("03");
    expect(formatExpiry("829")).toBe("08/29");
  });

  it("lets the person erase back through the slash", () => {
    expect(formatExpiry("01/")).toBe("01/");
    expect(formatExpiry("01")).toBe("01");
    expect(formatExpiry("/")).toBe("");
  });

  it("drops what is not a digit and what does not fit", () => {
    expect(formatExpiry("01-29x")).toBe("01/29");
    expect(formatExpiry("012999")).toBe("01/29");
  });
});

describe("formatCardNumber", () => {
  it("groups the digits as the card prints them", () => {
    expect(formatCardNumber("4242424242424242")).toBe("4242 4242 4242 4242");
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
    expect(formatCardNumber("4242-4242 42")).toBe("4242 4242 42");
  });

  it("stops at the brand's length", () => {
    expect(formatCardNumber("3782822463100059999")).toBe("3782 822463 10005");
  });

  it("tells the brand from the first digits", () => {
    expect(cardBrandOf("4")).toBe("VISA");
    expect(cardBrandOf("5555")).toBe("MASTERCARD");
    expect(cardBrandOf("2221")).toBe("MASTERCARD");
    expect(cardBrandOf("37")).toBe("AMEX");
    expect(cardBrandOf("36")).toBe("DINERS");
    expect(cardBrandOf("9")).toBeNull();
  });
});

describe("cardFormSchema", () => {
  it("takes the expiry with or without the slash", () => {
    for (const expiry of [`08/${nextYear}`, `08${nextYear}`, `8/${nextYear}`]) {
      const result = cardFormSchema({ ...card, expiry });
      expect(result instanceof type.errors ? result.summary : result.expiry).toEqual({
        month: "08",
        year: nextYear,
      });
    }
  });

  it("refuses an expired card", () => {
    const result = cardFormSchema({ ...card, expiry: "01/22" });
    expect(result instanceof type.errors && result.summary).toContain("La tarjeta ya venció");
  });

  it("refuses a month that does not exist", () => {
    const result = cardFormSchema({ ...card, expiry: `13/${nextYear}` });
    expect(result instanceof type.errors && result.summary).toContain("Escribe el vencimiento");
  });

  it("keeps only digits in the security code", () => {
    expect(formatCvc("1a2 3")).toBe("123");
    expect(formatCvc("12345")).toBe("1234");
  });
});
