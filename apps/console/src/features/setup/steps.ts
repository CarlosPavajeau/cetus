import type { IssuerDetail } from "~/lib/api/types";

export const steps = [
  { title: "Datos del emisor" },
  { title: "Software DIAN" },
  { title: "Certificado digital" },
  { title: "Numeración" },
] as const;

export type Step = 1 | 2 | 3 | 4;

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
  return (index === -1 ? 4 : index + 1) as Step;
}
