const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});
const count = new Intl.NumberFormat("es-CO");

export function formatCop(amount: number) {
  return cop.format(amount);
}

export function formatCount(value: number) {
  return count.format(value);
}

/** "Octubre de 2026" for a YYYY-MM period, read in Colombia like the period itself. */
export function periodLabel(period: string) {
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}
