import { type } from "arktype";
import { describe, expect, it } from "vite-plus/test";

import {
  cardBrandOf,
  formatCardNumber,
  formatCvc,
  formatExpiry,
  reformat,
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
    expect(formatExpiry("1/29")).toBe("1/29");
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

describe("reformat", () => {
  it("keeps the caret on the digit typed in the middle of the number", () => {
    // "4242 4242|" → a 9 typed after the 6th digit of "4242 42|42".
    expect(reformat("4242 429242", 8, "4242 4242", formatCardNumber, null)).toEqual({
      value: "4242 4292 42",
      caret: 8,
    });
  });

  it("moves past a space the format inserts before the caret", () => {
    expect(reformat("42424", 5, "4242", formatCardNumber, null)).toEqual({
      value: "4242 4",
      caret: 6,
    });
  });

  it("erases the digit before a space when backspace hits the space", () => {
    // Caret after "4242 " and backspace: the browser erased the space.
    expect(reformat("42424242", 4, "4242 4242", formatCardNumber, "backward")).toEqual({
      value: "4244 242",
      caret: 3,
    });
  });

  it("erases the digit after a space when delete hits the space", () => {
    expect(reformat("42424242", 4, "4242 4242", formatCardNumber, "forward")).toEqual({
      value: "4242 242",
      caret: 4,
    });
  });

  it("keeps the caret after a month the format pads", () => {
    expect(reformat("3", 1, "", formatExpiry, null)).toEqual({ value: "03", caret: 2 });
  });

  it("keeps the caret after the slash when the year's first digit is erased", () => {
    expect(reformat("08/9", 3, "08/29", formatExpiry, "backward")).toEqual({
      value: "08/9",
      caret: 3,
    });
    expect(reformat("08/39", 4, "08/9", formatExpiry, null)).toEqual({ value: "08/39", caret: 4 });
  });

  it("edits the month without filling in a 0", () => {
    expect(reformat("0/39", 1, "08/39", formatExpiry, "backward")).toEqual({
      value: "0/39",
      caret: 1,
    });
    expect(reformat("09/39", 2, "0/39", formatExpiry, null)).toEqual({ value: "09/39", caret: 2 });
  });

  it("goes on typing the year after a slash", () => {
    expect(reformat("01/2", 4, "01/", formatExpiry, null)).toEqual({ value: "01/2", caret: 4 });
    expect(reformat("012", 3, "01", formatExpiry, null)).toEqual({ value: "01/2", caret: 4 });
  });
});
