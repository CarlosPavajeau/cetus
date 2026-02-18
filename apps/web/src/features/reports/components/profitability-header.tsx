import type { PeriodPreset } from '@cetus/api-client/types/reports'
import { Popover, PopoverContent, PopoverTrigger } from '@cetus/ui/popover'
import { Button } from '@cetus/web/components/ui/button'
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@cetus/web/components/ui/toggle-group'
import { cn } from '@cetus/web/shared/utils'
import { subMonths } from 'date-fns'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { useState } from 'react'

export type FilterState = {
  preset: PeriodPreset
  year?: number
  month?: number
  excludeCanceled: boolean
  excludeRefunded: boolean
}

export function getDefaultFilters(): FilterState {
  return {
    preset: 'this_month',
    excludeCanceled: false,
    excludeRefunded: false,
  }
}

const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
] as const

const MONTH_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

function getComparisonLabel(filters: FilterState, now: Date): string {
  let d: Date
  if (filters.preset === 'this_month') {
    d = subMonths(now, 1)
  } else if (filters.preset === 'last_month') {
    d = subMonths(now, 2)
  } else {
    const y = filters.year ?? now.getFullYear()
    const m = filters.month ?? now.getMonth() + 1
    d = subMonths(new Date(y, m - 1), 1)
  }
  return `${MONTH_LONG[d.getMonth()] ?? ''} ${d.getFullYear()}`
}

type Props = {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

export function ProfitabilityHeader({
  filters,
  onFiltersChange,
}: Readonly<Props>) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(
    filters.year ?? new Date().getFullYear(),
  )

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const comparisonLabel = getComparisonLabel(filters, now)
  const isCustom = filters.preset === 'specific_month'

  const customTabLabel = isCustom
    ? `${MONTH_SHORT[(filters.month ?? currentMonth) - 1] ?? ''} ${filters.year ?? currentYear}`
    : 'Personalizado'

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setPickerYear(filters.year ?? currentYear)
    }
    setOpen(isOpen)
  }

  const handlePresetChange = (val: string) => {
    if (!val) {
      return
    }
    const preset = val as PeriodPreset
    if (preset === 'specific_month') {
      const initYear = filters.year ?? currentYear
      const initMonth = filters.month ?? currentMonth
      setPickerYear(initYear)
      onFiltersChange({ ...filters, preset, year: initYear, month: initMonth })
    } else {
      onFiltersChange({ ...filters, preset, year: undefined, month: undefined })
      setOpen(false)
    }
  }

  const handleMonthSelect = (month: number) => {
    onFiltersChange({
      ...filters,
      preset: 'specific_month',
      year: pickerYear,
      month,
    })
    setOpen(false)
  }

  const isFutureMonth = (year: number, month: number) =>
    year > currentYear || (year === currentYear && month > currentMonth)

  const excludeValue = [
    ...(filters.excludeCanceled ? ['canceled'] : []),
    ...(filters.excludeRefunded ? ['refunded'] : []),
  ]

  const handleExcludeChange = (vals: string[]) => {
    onFiltersChange({
      ...filters,
      excludeCanceled: vals.includes('canceled'),
      excludeRefunded: vals.includes('refunded'),
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="font-heading font-semibold text-2xl tracking-tight">
          Rentabilidad mensual
        </h1>
        <p className="mt-0.5 text-muted-foreground text-sm">
          Comparado con{' '}
          <span className="font-medium text-foreground">{comparisonLabel}</span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Preset selector — Popover nests inside ToggleGroup so ToggleGroupItem
            renders as a direct DOM child (Popover has no DOM node of its own),
            preserving group CSS selectors and ToggleGroupContext access. */}
        <ToggleGroup
          onValueChange={handlePresetChange}
          size="sm"
          type="single"
          value={filters.preset}
          variant="outline"
        >
          <ToggleGroupItem value="this_month">Este mes</ToggleGroupItem>
          <ToggleGroupItem value="last_month">Mes anterior</ToggleGroupItem>

          <Popover onOpenChange={handleOpenChange} open={open}>
            <PopoverTrigger asChild>
              <ToggleGroupItem className="gap-1" value="specific_month">
                {customTabLabel}
                <ChevronDownIcon
                  className={cn(
                    'size-3 opacity-60 transition-transform duration-150',
                    open && 'rotate-180',
                  )}
                />
              </ToggleGroupItem>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <Button
                  onClick={() => setPickerYear((y) => y - 1)}
                  size="icon-xs"
                  variant="ghost"
                >
                  <ChevronLeftIcon />
                </Button>
                <span className="font-medium text-sm tabular-nums">
                  {pickerYear}
                </span>
                <Button
                  disabled={pickerYear >= currentYear}
                  onClick={() => setPickerYear((y) => y + 1)}
                  size="icon-xs"
                  variant="ghost"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {MONTH_SHORT.map((label, i) => {
                  const m = i + 1
                  const isSelected =
                    pickerYear === filters.year && m === filters.month
                  const disabled = isFutureMonth(pickerYear, m)
                  return (
                    <Button
                      disabled={disabled}
                      key={label}
                      onClick={() => handleMonthSelect(m)}
                      size="xs"
                      variant={isSelected ? 'secondary' : 'ghost'}
                    >
                      {label}
                    </Button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </ToggleGroup>

        <ToggleGroup
          onValueChange={handleExcludeChange}
          size="sm"
          type="multiple"
          value={excludeValue}
          variant="outline"
        >
          <ToggleGroupItem value="canceled">Sin canceladas</ToggleGroupItem>
          <ToggleGroupItem value="refunded">Sin reembolsadas</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}
