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

/** The period's documents per issue day, stacked by outcome. One day alone makes a single bar, said in a line. */
export function DailyChart({ metrics }: { metrics: Metrics }) {
  const data = metrics.days.map((day) => ({ date: day.date, ...day.documents }));
  const daysIssued = metrics.days.filter((day) => day.documents.total > 0);
  const [dayOnly] = daysIssued;

  if (daysIssued.length === 1 && dayOnly !== undefined) {
    return (
      <p className="text-sm text-pretty text-muted-foreground">
        {`Todos los documentos del periodo son del ${formatDayLong(dayOnly.date)}. La gráfica por día aparece desde el segundo día con documentos.`}
      </p>
    );
  }

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
          {series.map((key) => (
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
        {metrics.days
          .filter((day) => day.documents.total > 0)
          .map((day) => (
            <li key={day.date}>
              {`${formatDayLong(day.date)}: ${series
                .map((key) => `${config[key].label} ${formatCount(day.documents[key])}`)
                .join(", ")}`}
            </li>
          ))}
      </ul>
    </figure>
  );
}
