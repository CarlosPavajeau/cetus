// The Java API behind the console (/console), called with the JWT the console's server mints.
// Isolates the API and Postgres from the console's own rendering (see console-pages.js).
//   PROFILE=load RATE=150 bench/bench.sh run console-api
import { profile, thresholds } from "../lib/common.js";

export { setup, consoleApi } from "../lib/flows.js";

export const options = {
  scenarios: { console_api: profile("consoleApi") },
  thresholds,
};
