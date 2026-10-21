// The integrator API (/v1) on its own: issuing invoices and polling them, as ERPs do.
// Measures the API's intake; the worker processes the queue behind it at its own pace (see end-to-end.js).
//   PROFILE=load RATE=200 bench/bench.sh run public-api
import { profile, thresholds } from "../lib/common.js";

export { publicApi } from "../lib/flows.js";

export const options = {
  scenarios: { public_api: profile("publicApi") },
  thresholds,
};
