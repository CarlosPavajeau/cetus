// Invoices from the POST to the DIAN's answer: how many documents per second the worker turns into
// ACCEPTED, and how long an integrator waits. Run it with the mock at 0 and at a realistic latency:
//   RATE=2 DURATION=5m bench/bench.sh run end-to-end
//   DIAN_LATENCY=PT1.5S RATE=2 DURATION=5m bench/bench.sh run end-to-end
// RATE is invoices per second, held constant for DURATION; a backlog that keeps growing means RATE is
// above what the worker sustains. It takes one decimal (RATE=3.5), sent as arrivals per 10 seconds.
import { holds } from "../lib/common.js";
import { endToEnd } from "../lib/flows.js";

export { endToEnd };

const rate = Number(__ENV.RATE || 2);
const arrivalsPer10s = Math.round(rate * 10);
if (!(arrivalsPer10s > 0) || Math.abs(arrivalsPer10s - rate * 10) > 1e-9) {
  throw new Error(`RATE must be positive with at most one decimal, got ${__ENV.RATE}`);
}

export const options = {
  scenarios: {
    end_to_end: {
      executor: "constant-arrival-rate",
      exec: "endToEnd",
      rate: arrivalsPer10s,
      timeUnit: "10s",
      duration: __ENV.DURATION || "5m",
      // Each iteration waits for its document, so it holds a VU for up to END_TO_END_TIMEOUT seconds.
      preAllocatedVUs: Math.min(1000, Math.ceil(rate * 30)),
      maxVUs: Math.min(3000, Math.ceil(rate * 200)),
    },
  },
  thresholds: {
    ...holds(rate),
    ...(__ENV.WAIT_DELIVERY === "1"
      ? {
          delivery_completed: ["rate>0.99"],
          artifacts_ready: ["rate>0.99"],
          time_to_delivery: ["p(95)<30000"],
        }
      : {}),
    // Fast rejections or failed POSTs must not pass for capacity.
    accepted: ["rate>0.99"],
    "http_req_duration{name:POST /v1/invoices}": ["p(95)<500"],
    time_to_final_status: ["p(95)<30000"],
    "final_status{status:TIMED_OUT}": ["count==0"],
  },
};
