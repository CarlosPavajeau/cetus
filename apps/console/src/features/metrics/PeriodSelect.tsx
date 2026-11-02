import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { type Period, periodLabel, periods } from "./periods";

const items = periods.map((value) => ({ label: periodLabel[value], value }));

export function PeriodSelect({
  value,
  onChange,
}: {
  value: Period;
  onChange: (period: Period) => void;
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        const period = periods.find((each) => each === next);
        if (period) {
          onChange(period);
        }
      }}
    >
      <SelectTrigger aria-label="Periodo" className="min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
