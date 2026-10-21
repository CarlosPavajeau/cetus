// Everything at once, as production would see it: integrators on /v1 plus people in the console.
// RATE is the total; SHARES splits it (default 60% public API, 25% console pages, 15% console API calls
// made outside page loads). Use it to confirm the capacity found by the single-surface scenarios.
//   PROFILE=load RATE=120 bench/bench.sh run mixed
import { profile } from "../lib/common.js";

export { consoleApi, consolePages, publicApi, setup } from "../lib/flows.js";

const rate = Number(__ENV.RATE || 50);
const [publicShare, pagesShare, apiShare] = (__ENV.SHARES || "60,25,15").split(",").map(Number);
const share = (value) => ({ rate: Math.max(1, Math.round((rate * value) / 100)) });

export const options = {
  scenarios: {
    public_api: profile("publicApi", share(publicShare)),
    console_pages: profile("consolePages", share(pagesShare)),
    console_api: profile("consoleApi", share(apiShare)),
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{scenario:public_api}": ["p(95)<500"],
    "http_req_duration{scenario:console_api}": ["p(95)<500"],
    "http_req_duration{scenario:console_pages}": ["p(95)<1000"],
  },
};
