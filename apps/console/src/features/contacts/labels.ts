import type { ContactCategory } from "~/lib/api/types";

/** What each category receives, in the order the page shows them. */
export const categories: { value: ContactCategory; title: string; description: string }[] = [
  {
    value: "FISCAL",
    title: "Fiscal",
    description:
      "Vencimiento del certificado y de las resoluciones, rangos por agotarse y aumento de rechazos de la DIAN.",
  },
  {
    value: "TECHNICAL",
    title: "Técnico",
    description: "Webhooks que fallan o se desactivan, y aumento de rechazos de la DIAN.",
  },
  {
    value: "BILLING",
    title: "Facturación",
    description: "Tu plan, tus pagos y el estado de tu cuenta en Cetus.",
  },
];

export const categoryTitle: Record<ContactCategory, string> = {
  FISCAL: "fiscales",
  TECHNICAL: "técnicos",
  BILLING: "de facturación",
};

/** ["TECHNICAL", "FISCAL"] → "técnicos y fiscales". */
export function categoriesTitle(values: ContactCategory[]): string {
  const titles = values.map((value) => categoryTitle[value]);
  return titles.length <= 1
    ? (titles[0] ?? "")
    : `${titles.slice(0, -1).join(", ")} y ${titles[titles.length - 1]}`;
}
