export const periods = ["last7", "last30", "thisMonth", "lastMonth"] as const;

export type Period = (typeof periods)[number];

export const periodDefault: Period = "last30";

export const periodLabel: Record<Period, string> = {
  last7: "Últimos 7 días",
  last30: "Últimos 30 días",
  thisMonth: "Este mes",
  lastMonth: "Mes anterior",
};

export type DateRange = { from: string; to: string };

const isoDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" });

/** Today in Colombia as YYYY-MM-DD, the calendar the issue dates follow. */
export function todayInColombia(now: Date = new Date()) {
  return isoDate.format(now);
}

const ranges: Record<Period, (day: Date) => { from: Date; to: Date }> = {
  last7: (day) => ({ from: addDays(day, -6), to: day }),
  last30: (day) => ({ from: addDays(day, -29), to: day }),
  thisMonth: (day) => ({ from: monthStart(day, 0), to: day }),
  lastMonth: (day) => ({ from: monthStart(day, -1), to: addDays(monthStart(day, 0), -1) }),
};

/** The days of a period, both included, as YYYY-MM-DD in Colombia. */
export function periodRange(period: Period, today: string): DateRange {
  const { from, to } = ranges[period](new Date(`${today}T00:00:00Z`));
  return { from: iso(from), to: iso(to) };
}

function addDays(day: Date, days: number) {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + days));
}

function monthStart(day: Date, months: number) {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + months, 1));
}

function iso(day: Date) {
  return day.toISOString().slice(0, 10);
}
