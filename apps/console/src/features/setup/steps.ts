import type { IssuerDetail, IssuerGap } from "~/lib/api/types";

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

/** What each step after the first one fills; the API says which of them the issuer still lacks. */
const stepGaps: readonly (readonly IssuerGap[])[] = [
  ["SOFTWARE_MISSING"],
  ["CERTIFICATE_MISSING", "CERTIFICATE_EXPIRED"],
  ["INVOICE_RANGE_MISSING"],
];

/** Whether each step already has its piece saved in the API, in step order. */
export function completedSteps(issuer: IssuerDetail | null): boolean[] {
  if (issuer === null) {
    return steps.map(() => false);
  }
  const { missing } = issuer.readiness;
  return [true, ...stepGaps.map((gaps) => !gaps.some((gap) => missing.includes(gap)))];
}

/** The step to resume at: the first one without its piece. Later steps are not reachable yet. */
export function firstIncompleteStep(issuer: IssuerDetail | null): Step {
  const index = completedSteps(issuer).indexOf(false);
  return clampStep(index === -1 ? steps.length : index + 1);
}
