import { formatCop } from "~/features/usage/labels";
import type { ObligationAnswer, ObligationCap } from "~/lib/api/types";

/**
 * The calculator's answers. A legal entity is obligated whatever else it answers, so it answers nothing else;
 * the API rejects any other shape.
 */
export type ObligationAnswers =
  | { personType: "LEGAL_ENTITY" }
  | {
      personType: "NATURAL_PERSON";
      simpleRegime: ObligationAnswer;
      incomeOverCap: ObligationAnswer;
      severalEstablishments: ObligationAnswer;
      otherConditions: ObligationAnswer;
    };

export type NaturalPersonQuestion = Exclude<
  keyof Extract<ObligationAnswers, { personType: "NATURAL_PERSON" }>,
  "personType"
>;

export type ObligationVerdict = "OBLIGATED" | "NOT_OBLIGATED" | "REVIEW";

export const naturalPersonQuestions: readonly NaturalPersonQuestion[] = [
  "simpleRegime",
  "incomeOverCap",
  "severalEstablishments",
  "otherConditions",
];

/**
 * The general DIAN rules, as InvoicingObligation applies them in the API for the email: a natural person is not
 * obligated only while not responsible for VAT, which takes every condition at once.
 */
export function assessObligation(answers: ObligationAnswers): ObligationVerdict {
  if (answers.personType === "LEGAL_ENTITY") {
    return "OBLIGATED";
  }
  const values = new Set(naturalPersonQuestions.map((question) => answers[question]));
  if (values.has("YES")) {
    return "OBLIGATED";
  }
  return values.has("UNKNOWN") ? "REVIEW" : "NOT_OBLIGATED";
}

/** The cap the answers compare against; 3.500 UVT is fixed by law, its value in pesos changes every year. */
export const capUvt = 3500;

/** "3.500 UVT ($183.309.000)", or the UVT alone while the API has no value for this year. */
export function capLabel(cap: ObligationCap | null | undefined) {
  const uvt = `${new Intl.NumberFormat("es-CO").format(cap?.uvt ?? capUvt)} UVT`;
  return cap ? `${uvt} (${formatCop(cap.uvt * cap.uvtValueCop)})` : uvt;
}
