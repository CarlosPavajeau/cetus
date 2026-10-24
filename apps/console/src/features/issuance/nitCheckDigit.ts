const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/**
 * Verification digit (DV) of a Colombian NIT, modulus 11, as the DIAN computes it. The API computes it too;
 * this one only lets the form check what the person typed before sending it.
 */
export function nitCheckDigit(nit: string): string | null {
  if (!/^\d{1,15}$/.test(nit)) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < nit.length; i++) {
    sum += Number(nit[nit.length - 1 - i]) * (weights[i] ?? 0);
  }
  const remainder = sum % 11;
  return String(remainder > 1 ? 11 - remainder : remainder);
}
