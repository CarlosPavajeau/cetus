import { describe, expect, it } from "vite-plus/test";

import { periodRange, todayInColombia } from "~/features/metrics/periods";

describe("periodRange", () => {
  it("counts today among the last days", () => {
    expect(periodRange("last7", "2026-11-01")).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    expect(periodRange("last30", "2026-03-01")).toEqual({ from: "2026-01-31", to: "2026-03-01" });
  });

  it("starts this month on its first day and ends last month on its last", () => {
    expect(periodRange("thisMonth", "2026-11-01")).toEqual({
      from: "2026-11-01",
      to: "2026-11-01",
    });
    expect(periodRange("lastMonth", "2026-03-15")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
    expect(periodRange("lastMonth", "2026-01-10")).toEqual({
      from: "2025-12-01",
      to: "2025-12-31",
    });
  });
});

describe("todayInColombia", () => {
  it("changes day at midnight in Colombia, not in UTC", () => {
    expect(todayInColombia(new Date("2026-11-02T04:59:59Z"))).toBe("2026-11-01");
    expect(todayInColombia(new Date("2026-11-02T05:00:00Z"))).toBe("2026-11-02");
  });
});
