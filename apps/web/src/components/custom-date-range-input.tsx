import { format } from 'date-fns'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Button } from './ui/button'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'

type Props = {
  values: unknown[]
  onChange: (values: unknown[]) => void
}

export function CustomDateRangeInput({ values, onChange }: Props) {
  const [date, setDate] = useState<DateRange | undefined>(
    values?.[0] && typeof values[0] === 'string'
      ? {
          from: new Date(values[0] as string),
          to:
            values[1] && typeof values[1] === 'string'
              ? new Date(values[1] as string)
              : undefined,
        }
      : undefined,
  )
  const [isOpen, setIsOpen] = useState(false)
  const handleApply = () => {
    if (date?.from) {
      const fromStr = date.from.toISOString().split('T')[0]
      const toStr = date.to ? date.to.toISOString().split('T')[0] : fromStr
      onChange([fromStr, toStr])
    }
    setIsOpen(false)
  }
  const handleCancel = () => {
    setIsOpen(false)
  }
  const handleSelect = (selected: DateRange | undefined) => {
    setDate(selected)
  }
  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger className="cursor-pointer">
        {date?.from ? (
          date.to ? (
            <>
              {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
            </>
          ) : (
            format(date.from, 'LLL dd, y')
          )
        ) : (
          <span>Pick a date range</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" sideOffset={8}>
        <Calendar
          autoFocus
          defaultMonth={date?.from}
          mode="range"
          numberOfMonths={2}
          onSelect={handleSelect}
          selected={date}
          showOutsideDays={false}
        />
        <div className="flex items-center justify-end gap-1.5 border-border border-t p-3">
          <Button onClick={handleCancel} variant="outline">
            Cancelar
          </Button>
          <Button onClick={handleApply}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
