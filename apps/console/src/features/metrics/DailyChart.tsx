import { Bar, BarChart, type BarShapeProps, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { formatCount } from "~/features/usage/labels";
import type { Metrics } from "~/lib/api/types";

import { formatDay, formatDayLong } from "./labels";

const config = {
  accepted: { label: "Aceptados", color: "var(--success)" },
  rejected: { label: "Rechazados", color: "var(--destructive)" },
  failed: { label: "Fallidos", color: "var(--warning)" },
  inProgress: { label: "En curso", color: "var(--info)" },
} satisfies ChartConfig;

const series = ["accepted", "rejected", "failed", "inProgress"] as const;

/** Recharts sorts the legend and the tooltip by name; they follow the stack instead. */
function stackOrder(item: { dataKey?: unknown }) {
  return series.findIndex((key) => key === item.dataKey);
}

/** State color reaches a surface as a tint; the solid hue only rules the top of each entry. */
function EntryBar({ x, y, width, height, fill }: BarShapeProps) {
  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return <g />;
  }
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.24} />
      <rect x={x} y={y} width={width} height={Math.min(2, height)} fill={fill} />
    </g>
  );
}

const outcomeText = {
  accepted: { one: "aceptado", many: "aceptados", className: "" },
  rejected: {
    one: "rechazado",
    many: "rechazados",
    className: "font-medium text-destructive-foreground",
  },
  failed: { one: "fallido", many: "fallidos", className: "font-medium text-warning-foreground" },
  inProgress: { one: "en curso", many: "en curso", className: "" },
} satisfies Record<(typeof series)[number], { one: string; many: string; className: string }>;

/** Below this many issue days a few bars would fill the card without saying more than their counts. */
const chartDaysMin = 6;

/** The period's documents per issue day, stacked by outcome; a handful of days reads as a ruled list instead. */
export function DailyChart({ metrics }: { metrics: Metrics }) {
  const daysIssued = metrics.days.filter((day) => day.documents.total > 0);

  if (daysIssued.length < chartDaysMin) {
    return (
      <section aria-labelledby="daily-documents" className="flex flex-col gap-2">
        <h3 id="daily-documents" className="text-sm font-medium">
          Documentos por día
        </h3>
        <ul className="flex flex-col divide-y border-y">
          {daysIssued.map((day) => (
            <li key={day.date} className="flex items-baseline justify-between gap-3 py-2">
              <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <time dateTime={day.date} className="w-14 shrink-0 text-sm">
                  {formatDay(day.date)}
                </time>
                <p className="text-2xs text-muted-foreground tabular-nums">
                  {series
                    .filter((key) => day.documents[key] > 0)
                    .map((key, index) => {
                      const count = day.documents[key];
                      const text = outcomeText[key];
                      return (
                        <span key={key}>
                          {index > 0 && " · "}
                          <span className={text.className}>
                            {`${formatCount(count)} ${count === 1 ? text.one : text.many}`}
                          </span>
                        </span>
                      );
                    })}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums">
                {formatCount(day.documents.total)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const data = metrics.days.map((day) => ({ date: day.date, ...day.documents }));
  const seriesShown = series.filter((key) => daysIssued.some((day) => day.documents[key] > 0));

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">Documentos por día de emisión</figcaption>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value: string) => formatDay(value)}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
          <ChartTooltip
            itemSorter={stackOrder}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const row: unknown = payload[0]?.payload;
                  return typeof row === "object" &&
                    row !== null &&
                    "date" in row &&
                    typeof row.date === "string"
                    ? formatDayLong(row.date)
                    : "";
                }}
              />
            }
          />
          <ChartLegend itemSorter={stackOrder} content={<ChartLegendContent />} />
          {seriesShown.map((key) => (
            <Bar
              key={key}
              dataKey={key}
              stackId="documents"
              fill={`var(--color-${key})`}
              shape={EntryBar}
            />
          ))}
        </BarChart>
      </ChartContainer>
      <ul className="sr-only">
        {daysIssued.map((day) => (
          <li key={day.date}>
            {`${formatDayLong(day.date)}: ${seriesShown
              .map((key) => `${config[key].label} ${formatCount(day.documents[key])}`)
              .join(", ")}`}
          </li>
        ))}
      </ul>
    </figure>
  );
}
