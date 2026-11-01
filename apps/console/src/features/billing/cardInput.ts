export type CardBrand = "VISA" | "MASTERCARD" | "AMEX" | "DINERS";

export const cardBrandLabel: Record<CardBrand, string> = {
  VISA: "Visa",
  MASTERCARD: "Mastercard",
  AMEX: "American Express",
  DINERS: "Diners Club",
};

/** The brand its first digits announce, while the person types; null until they tell. */
export function cardBrandOf(number: string): CardBrand | null {
  const digits = number.replace(/\D/g, "");
  if (digits.startsWith("4")) {
    return "VISA";
  }
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) {
    return "MASTERCARD";
  }
  if (/^3[47]/.test(digits)) {
    return "AMEX";
  }
  if (/^3(0[0-5]|[689])/.test(digits)) {
    return "DINERS";
  }
  return null;
}

/** Groups as printed on the card: 4-6-5 for American Express, 4-6-4 for Diners, fours for the rest. */
const groups: Record<CardBrand, number[]> = {
  VISA: [4, 4, 4, 4, 3],
  MASTERCARD: [4, 4, 4, 4],
  AMEX: [4, 6, 5],
  DINERS: [4, 6, 4],
};

/** "4242424242424242" → "4242 4242 4242 4242", dropping whatever is not a digit or does not fit the brand. */
export function formatCardNumber(value: string) {
  const brand = cardBrandOf(value);
  const sizes = brand ? groups[brand] : [4, 4, 4, 4, 3];
  const digits = value.replace(/\D/g, "").slice(
    0,
    sizes.reduce((total, size) => total + size, 0),
  );
  const parts: string[] = [];
  let start = 0;
  for (const size of sizes) {
    if (start >= digits.length) {
      break;
    }
    parts.push(digits.slice(start, start + size));
    start += size;
  }
  return parts.join(" ");
}

/**
 * The expiry as MM/AA whatever way it is typed: "0129" and "01/29" give "01/29", "1/29" gives "01/29", and a
 * first digit above 1 can only be a month of one digit, so "3" gives "03". A slash the person typed is kept, so
 * erasing the year leaves "01/" and then "01".
 */
export function formatExpiry(value: string) {
  const slash = value.indexOf("/");
  if (slash >= 0) {
    const month = value.slice(0, slash).replace(/\D/g, "").slice(0, 2);
    const year = value
      .slice(slash + 1)
      .replace(/\D/g, "")
      .slice(0, 2);
    if (month === "") {
      return "";
    }
    return `${month.length === 1 && year !== "" ? `0${month}` : month}/${year}`;
  }
  let digits = value.replace(/\D/g, "");
  if (/^[2-9]/.test(digits)) {
    digits = `0${digits}`;
  }
  digits = digits.slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** Only digits, at most four: American Express prints four, the rest three. */
export function formatCvc(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}
