// Shared by every k6 scenario: targets, the seeded tenants (bench/.state.json) and the load profiles.
import { SharedArray } from "k6/data";

export const apiUrl = __ENV.API_URL || "http://localhost:8180";
export const consoleUrl = __ENV.CONSOLE_URL || "http://localhost:3100";

/** The tenants bench/seed.ts created; each VU always acts as the same one. */
export const organizations = new SharedArray("organizations", () => {
  const state = JSON.parse(open("../.state.json"));
  return state.organizations;
});

export function organizationIndex(vu = __VU) {
  return (vu - 1) % organizations.length;
}

export function organizationOf(vu = __VU) {
  return organizations[organizationIndex(vu)];
}

export function cookieHeader(organization) {
  return organization.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

/** Picks a key of `weights` ({name: weight}) with probability proportional to its weight. */
export function weighted(weights) {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [name, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll < 0) {
      return name;
    }
  }
  return Object.keys(weights)[0];
}

/**
 * The load shape, in requests (iterations) per second so the target cannot hide its slowness by slowing
 * the generator down (open model). PROFILE picks it; RATE is the target rate for load, soak and stress.
 *
 *   smoke   2/s for 30s: the scenario works, nothing more
 *   load    ramps 10% → 100% of RATE in five 1-minute steps, then holds 2 minutes: where the knee is
 *   stress  ramps to 2× RATE: how it fails past the knee (errors, timeouts, recovery)
 *   soak    70% of RATE for 15 minutes: leaks, GC pauses, pool exhaustion over time
 *   constant RATE for DURATION (2 minutes): one point of the curve, to bracket the knee
 */
export function profile(exec, { rate = Number(__ENV.RATE || 50), maxVUs = Number(__ENV.MAX_VUS || 400) } = {}) {
  const base = { exec, timeUnit: "1s", preAllocatedVUs: Math.min(maxVUs, 50), maxVUs };
  switch (__ENV.PROFILE || "smoke") {
    case "smoke":
      return { ...base, executor: "constant-arrival-rate", rate: 2, duration: "30s", preAllocatedVUs: 5 };
    case "load":
      return {
        ...base,
        executor: "ramping-arrival-rate",
        startRate: Math.max(1, Math.round(rate * 0.1)),
        stages: [0.2, 0.4, 0.6, 0.8, 1, 1]
          .map((share) => ({ target: Math.max(1, Math.round(rate * share)), duration: "1m" }))
          .concat([{ target: rate, duration: "1m" }]),
      };
    case "stress":
      return {
        ...base,
        executor: "ramping-arrival-rate",
        startRate: Math.max(1, Math.round(rate * 0.2)),
        stages: [0.5, 1, 1.5, 2, 2]
          .map((share) => ({ target: Math.max(1, Math.round(rate * share)), duration: "1m" }))
          .concat([{ target: 0, duration: "30s" }]),
      };
    case "soak":
      return {
        ...base,
        executor: "constant-arrival-rate",
        rate: Math.max(1, Math.round(rate * 0.7)),
        duration: __ENV.DURATION || "15m",
      };
    case "constant":
      return { ...base, executor: "constant-arrival-rate", rate, duration: __ENV.DURATION || "2m" };
    default:
      throw new Error(`Unknown PROFILE ${__ENV.PROFILE}: use smoke, load, stress, soak or constant`);
  }
}

/** What "holds" means for an interactive request: p95 under 500 ms and under 1% errors. */
export const thresholds = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<500"],
};
