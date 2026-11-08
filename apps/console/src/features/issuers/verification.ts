import type { NumberingRange } from "~/lib/api/types";

/** How long the detail keeps asking for the DIAN's answer before showing it never came. */
const answerWaitMs = 2 * 60_000;
/** The API's IssuerOnboardingService.VERIFICATION_STALE: a request this old can be made again. */
const askAgainAfterMs = 10 * 60_000;

/**
 * Where a range's verification stands while it is PENDING: waiting for the worker, unanswered for longer than an
 * answer usually takes, or old enough to ask again. Null for any other status.
 */
export type PendingVerification = "waiting" | "unanswered" | "askAgain";

export function pendingVerification(
  range: NumberingRange,
  now = Date.now(),
): PendingVerification | null {
  if (range.verificationStatus !== "PENDING") {
    return null;
  }
  if (!range.verificationRequestedAt) {
    return "askAgain";
  }
  const waited = now - new Date(range.verificationRequestedAt).getTime();
  if (waited >= askAgainAfterMs) {
    return "askAgain";
  }
  return waited >= answerWaitMs ? "unanswered" : "waiting";
}
