import { Button } from '@cetus/ui/button'
import { Calendar } from '@cetus/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@cetus/ui/popover'
import { Calendar03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { memo, useState } from 'react'
import type { DateRange } from 'react-day-picker'

type DateRangeFilterProps = {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
}

type Preset = {
  label: string
  range: () => DateRange
}

const presets: Preset[] = [
  {
    label: 'Hoy',
    range: () => {
      const today = new Date()
      return { from: today, to: today }
    },
  },
  {
    label: 'Ayer',
    range: () => {
      const yesterday = subDays(new Date(), 1)
      return { from: yesterday, to: yesterday }
    },
  },
  {
    label: 'Últimos 7 días',
    range: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: 'Últimos 30 días',
    range: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: 'Esta semana',
    range: () => ({
      from: startOfWeek(new Date(), { locale: es }),
      to: endOfWeek(new Date(), { locale: es }),
    }),
  },
  {
    label: 'Este mes',
    range: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'Mes anterior',
    range: () => {
      const prev = subMonths(new Date(), 1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    },
  },
]

export const DateRangeFilter = memo(
  ({ from, to, onChange }: DateRangeFilterProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [date, setDate] = useState<DateRange | undefined>(undefined)

    const handleOpenChange = (open: boolean) => {
      if (open) {
        setDate({
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
        })
      }
      setIsOpen(open)
    }

    const handleApply = () => {
      if (date?.from) {
        const fromStr = date.from.toISOString().split('T')[0]
        const toStr = date.to ? date.to.toISOString().split('T')[0] : fromStr
        onChange({ from: fromStr, to: toStr })
      }
      setIsOpen(false)
    }

    const handleCancel = () => {
      setIsOpen(false)
    }

    const handleClear = () => {
      onChange({ from: undefined, to: undefined })
      setIsOpen(false)
    }

    const handlePreset = (preset: Preset) => {
      setDate(preset.range())
    }

    const hasRange = from && to

    const label = hasRange
      ? `${format(new Date(from), 'dd MMM yyyy', { locale: es })} - ${format(new Date(to), 'dd MMM yyyy', { locale: es })}`
      : 'Fecha'

    return (
      <Popover onOpenChange={handleOpenChange} open={isOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <HugeiconsIcon icon={Calendar03Icon} size={16} />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="flex w-auto p-0"
          sideOffset={8}
        >
          <div className="flex flex-col gap-1 border-border border-r p-3">
            {presets.map((preset) => (
              <Button
                className="justify-start"
                key={preset.label}
                onClick={() => handlePreset(preset)}
                size="sm"
                variant="ghost"
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div>
            <Calendar
              autoFocus
              defaultMonth={date?.from}
              locale={es}
              mode="range"
              numberOfMonths={2}
              onSelect={setDate}
              selected={date}
              showOutsideDays={false}
            />
            <div className="flex items-center justify-end gap-1.5 border-border border-t p-3">
              {hasRange && (
                <Button onClick={handleClear} variant="ghost">
                  Limpiar
                </Button>
              )}
              <Button onClick={handleCancel} variant="outline">
                Cancelar
              </Button>
              <Button onClick={handleApply}>Aplicar</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    )
  },
)
