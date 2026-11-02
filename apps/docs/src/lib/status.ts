export const components = ["API", "PROCESSING", "DIAN_LIVE", "DIAN_TEST"] as const;
export const statuses = ["OPERATIONAL", "DEGRADED", "OUTAGE"] as const;
export const impacts = ["DEGRADED", "OUTAGE"] as const;

export type Component = (typeof components)[number];
export type ComponentStatus = (typeof statuses)[number];
export type Impact = (typeof impacts)[number];

export type Incident = {
  id: string;
  component: Component;
  impact: Impact;
  title: string;
  message: string;
  startedAt: string;
  resolvedAt: string | null;
};

export type PlatformStatus = {
  components: { component: Component; status: ComponentStatus }[];
  incidents: Incident[];
  checkedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function oneOf<T extends string>(options: readonly T[], value: unknown): T | undefined {
  return options.find((option) => option === value);
}

function text(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("Expected a string");
  }
  return value;
}

function member<T extends string>(options: readonly T[], value: unknown): T {
  const found = oneOf(options, value);
  if (!found) {
    throw new TypeError(`Unknown value ${String(value)}`);
  }
  return found;
}

function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new TypeError("Expected a list");
  }
  return value;
}

function record(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError("Expected an object");
  }
  return value;
}

/** Reads GET /status, rejecting anything that does not match it. */
export function parseStatus(body: unknown): PlatformStatus {
  const status = record(body);
  return {
    checkedAt: text(status.checkedAt),
    components: list(status.components).map((each) => {
      const component = record(each);
      return {
        component: member(components, component.component),
        status: member(statuses, component.status),
      };
    }),
    incidents: list(status.incidents).map((each) => {
      const incident = record(each);
      return {
        id: text(incident.id),
        component: member(components, incident.component),
        impact: member(impacts, incident.impact),
        title: text(incident.title),
        message: text(incident.message),
        startedAt: text(incident.startedAt),
        resolvedAt: incident.resolvedAt === null ? null : text(incident.resolvedAt),
      };
    }),
  };
}
