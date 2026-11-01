import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import type { Metrics } from "~/lib/api/types";

import { formatDay, formatDayLong } from "./labels";

const config = {
  accepted: { label: "Aceptados", color: "var(--success)" },
  rejected: { label: "Rechazados", color: "var(--destructive)" },
  failed: { label: "Fallidos", color: "var(--warning)" },
  inProgress: { label: "En curso", color: "var(--info)" },
} satisfies ChartConfig;

const series = ["accepted", "rejected", "failed", "inProgress"] as const;

/** The period's documents per issue day, stacked by outcome. */
export function DailyChart({ metrics }: { metrics: Metrics }) {
  const data = metrics.days.map((day) => ({ date: day.date, ...day.documents }));

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
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const date: unknown = payload[0]?.payload?.date;
                  return typeof date === "string" ? formatDayLong(date) : "";
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          {series.map((key) => (
            <Bar key={key} dataKey={key} stackId="documents" fill={`var(--color-${key})`} />
          ))}
        </BarChart>
      </ChartContainer>
    </figure>
  );
}
