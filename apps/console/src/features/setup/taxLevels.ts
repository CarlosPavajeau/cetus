/**
 * The fiscal responsibilities of the RUT (box 53) that electronic invoices accept: annex table 13.2.6.1 of
 * the DIAN. The API refuses any other code.
 */
export const taxLevelItems = [
  { value: "O-13", label: "Gran contribuyente" },
  { value: "O-15", label: "Autorretenedor" },
  { value: "O-23", label: "Agente de retención IVA" },
  { value: "O-47", label: "Régimen simple de tributación" },
  { value: "R-99-PN", label: "No aplica – Otros" },
] as const;

export type TaxLevelCode = (typeof taxLevelItems)[number]["value"];

export const taxLevelCodes = taxLevelItems.map((item) => item.value);

/** R-99-PN means "none of the others". */
const notApplicable: TaxLevelCode = "R-99-PN";

export function isTaxLevelCode(code: string): code is TaxLevelCode {
  return (taxLevelCodes as readonly string[]).includes(code);
}

/**
 * The selection after a change: choosing R-99-PN leaves it alone, and choosing any other code drops it.
 * Kept in the order of the table, as the RUT lists them.
 */
export function nextTaxLevels(
  previous: readonly TaxLevelCode[],
  next: TaxLevelCode[],
): TaxLevelCode[] {
  const added = next.filter((code) => !previous.includes(code));
  const chosen = added.includes(notApplicable)
    ? [notApplicable]
    : added.length > 0
      ? next.filter((code) => code !== notApplicable)
      : next;
  return taxLevelCodes.filter((code) => chosen.includes(code));
}
