import { format, parseISO } from "date-fns";
import { CalendarIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { es } from "react-day-picker/locale";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

import { formatDay } from "./labels";

const isoFormat = "yyyy-MM-dd";

function toIso(range: DateRange | undefined) {
  return {
    from: range?.from ? format(range.from, isoFormat) : undefined,
    to: range?.to ? format(range.to, isoFormat) : undefined,
  };
}

/** Issue date range, as ISO dates; either end may be open. */
export function IssueDateFilter({
  from,
  to,
  onChange,
}: {
  from?: string;
  to?: string;
  onChange: (range: { from?: string; to?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const applied: DateRange | undefined = from
    ? { from: parseISO(from), to: to ? parseISO(to) : undefined }
    : undefined;
  // The range is applied when the popover closes, so picking both ends filters only once.
  const [draft, setDraft] = useState<DateRange>();
  const label =
    from && to
      ? `${formatDay(from)} – ${formatDay(to)}`
      : from
        ? `Desde el ${formatDay(from)}`
        : to
          ? `Hasta el ${formatDay(to)}`
          : "Fecha de emisión";

  return (
    <div className="flex items-center gap-1">
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setDraft(applied);
            return;
          }
          const picked = toIso(draft);
          const current = toIso(applied);
          if (picked.from !== current.from || picked.to !== current.to) {
            onChange(picked);
          }
        }}
      >
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              // oxlint-disable-next-line shadcn/no-restyle -- a picker trigger reads as a field value, not an action
              className="font-normal"
            />
          }
        >
          <CalendarIcon data-icon="inline-start" className="text-muted-foreground" />
          {label}
          <ChevronDownIcon data-icon="inline-end" className="text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            locale={es}
            numberOfMonths={2}
            selected={draft}
            defaultMonth={draft?.from}
            onSelect={setDraft}
          />
        </PopoverContent>
      </Popover>
      {(from || to) && (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange({})}
          aria-label="Quitar filtro de fecha"
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}
