import type { IssuerDetail } from "~/lib/api/types";

export const steps = [
  { number: 1, title: "Datos del emisor" },
  { number: 2, title: "Software DIAN" },
  { number: 3, title: "Certificado digital" },
  { number: 4, title: "Numeración" },
] as const;

export type Step = (typeof steps)[number]["number"];

/** The step numbered `value`, or the nearest one when it is out of range. */
export function clampStep(value: number): Step {
  return steps.findLast((step) => step.number <= value)?.number ?? 1;
}

/** Whether each step already has its piece saved in the API, in step order. */
export function completedSteps(issuer: IssuerDetail | null): boolean[] {
  return [
    issuer !== null,
    Boolean(issuer?.software),
    Boolean(issuer?.certificate),
    Boolean(
      issuer?.ranges.some((range) => range.documentType === "INVOICE" && range.status === "ACTIVE"),
    ),
  ];
}

/** The step to resume at: the first one without its piece. Later steps are not reachable yet. */
export function firstIncompleteStep(issuer: IssuerDetail | null): Step {
  const index = completedSteps(issuer).indexOf(false);
  return clampStep(index === -1 ? steps.length : index + 1);
}
