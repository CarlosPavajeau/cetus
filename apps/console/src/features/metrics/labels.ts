const percent = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });
const dayMonth = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dayMonthYear = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" });

export function formatPercent(share: number) {
  return percent.format(share);
}

/** "48 s", "2 min 5 s" or "1 h 3 min": the DIAN answers in seconds, or much later while it is down. */
export function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  if (total < 60) {
    return `${total} s`;
  }
  const minutes = Math.floor(total / 60);
  if (minutes < 60) {
    const rest = total % 60;
    return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "COP" ? 0 : 2,
  }).format(amount);
}

/** "26 oct" for a YYYY-MM-DD day, read as the calendar day it already is. */
export function formatDay(day: string) {
  return dayMonth.format(new Date(`${day}T00:00:00Z`)).replace(".", "");
}

/** "26 de octubre de 2026" for a YYYY-MM-DD day. */
export function formatDayLong(day: string) {
  return dayMonthYear.format(new Date(`${day}T00:00:00Z`));
}
