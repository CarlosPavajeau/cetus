// The console's pages as a signed-in person loads them: server-rendered by the console (512 MB), which
// calls the API for each one. What a user actually waits for.
//   PROFILE=load RATE=40 bench/bench.sh run console-pages
import { holds, profile } from "../lib/common.js";

export { consolePages } from "../lib/flows.js";

export const options = {
  scenarios: { console_pages: profile("consolePages") },
  thresholds: {
    ...holds(),
    // A whole page, rendering included: a looser bar than a single API call.
    http_req_duration: ["p(95)<1000"],
  },
};
