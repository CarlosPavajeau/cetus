// A fixed zone keeps server and browser renders identical and matches the "Horarios de Colombia" notes.
const timeZone = "America/Bogota";

export const dateFormat = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone });
export const dateTimeFormat = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone,
});
export const timeFormat = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone,
});
export const timeWithSecondsFormat = new Intl.DateTimeFormat("es-CO", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZone,
});
const dayMonthYearFormat = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone,
});
const dayMonthFormat = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "short",
  timeZone,
});

/** Whether the date falls on the current day in Colombia. */
export function isToday(date: Date) {
  return dateFormat.format(date) === dateFormat.format(new Date());
}

/** "01 oct 2026, 10:15". Built from parts, since es-CO formats it as "01 de oct de 2026". */
export function formatDateTime(date: Date) {
  const parts = Object.fromEntries(
    dayMonthYearFormat.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.day} ${parts.month?.replace(".", "")} ${parts.year}, ${timeFormat.format(date)}`;
}

/** "Hoy, 09:42" for today, "01 oct 2026, 10:15" otherwise. */
export function formatRecentDateTime(date: Date) {
  return isToday(date) ? `Hoy, ${timeFormat.format(date)}` : formatDateTime(date);
}

/** "09:42:18" for today, "17 oct · 09:42:18" otherwise. */
export function formatRequestTime(date: Date) {
  const time = timeWithSecondsFormat.format(date);
  return isToday(date) ? time : `${dayMonthFormat.format(date)} · ${time}`;
}
