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
 * The expiry as MM/AA whatever way it is typed: "0129" and "01/29" give "01/29", and a first digit above 1 can
 * only be a month of one digit, so "3" gives "03". A month the person ends with a slash stays as typed ("1/29",
 * read as January), so editing it never fills in a 0; erasing the year leaves "01/" and then "01".
 */
export function formatExpiry(value: string) {
  const slash = value.indexOf("/");
  if (slash >= 0) {
    const month = value.slice(0, slash).replace(/\D/g, "").slice(0, 2);
    const year = value
      .slice(slash + 1)
      .replace(/\D/g, "")
      .slice(0, 2);
    return month === "" ? "" : `${month}/${year}`;
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

export type Formatted = { value: string; caret: number };

const digitsOf = (text: string) => text.replace(/\D/g, "");

/** Where the caret goes in the text to sit right after its count-th digit. */
function caretAfter(text: string, count: number) {
  if (count === 0) {
    return 0;
  }
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text.charAt(index))) {
      seen++;
      if (seen === count) {
        return index + 1;
      }
    }
  }
  return text.length;
}

/**
 * Formats what the person just typed and keeps the caret on the same digit, so editing in the middle of a
 * formatted value does not jump to its end. Erasing a separator (a space, the slash) erases the digit next to it
 * instead, or the key would seem to do nothing; a month the format pads with a 0 keeps the caret after it.
 */
export function reformat(
  raw: string,
  caret: number,
  previous: string,
  format: (value: string) => string,
  deletion: "backward" | "forward" | null,
): Formatted {
  let text = raw;
  let before = digitsOf(raw.slice(0, caret)).length;
  const separatorErased =
    deletion !== null && raw.length < previous.length && digitsOf(raw) === digitsOf(previous);
  if (separatorErased) {
    const target = deletion === "backward" ? before : before + 1;
    const index = caretAfter(raw, target) - 1;
    if (target > 0 && index >= 0 && index < raw.length) {
      text = raw.slice(0, index) + raw.slice(index + 1);
      before = deletion === "backward" ? before - 1 : before;
    }
  }
  const value = format(text);
  const added = digitsOf(value).length - digitsOf(text).length;
  if (added > 0) {
    before += added;
  }
  if (before >= digitsOf(value).length && caret >= raw.length) {
    return { value, caret: value.length };
  }
  let position = caretAfter(value, before);
  // A caret that stood after a separator, such as the expiry's slash, stays after it.
  if (!separatorErased && caret > 0 && /\D/.test(raw.charAt(caret - 1))) {
    while (position < value.length && /\D/.test(value.charAt(position))) {
      position++;
    }
  }
  return { value, caret: position };
}
