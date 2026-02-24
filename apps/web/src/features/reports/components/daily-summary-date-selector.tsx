import { Calendar } from '@cetus/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@cetus/ui/popover'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { Button } from '@cetus/web/components/ui/button'
import { Calendar03Icon, Refresh01FreeIcons } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { format, isToday, isYesterday, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { parseAsString, useQueryState } from 'nuqs'
import { useState } from 'react'

type Props = {
  dataUpdatedAt: number
  onRefresh: () => void
}

export function DailySummaryDateSelector({
  dataUpdatedAt,
  onRefresh,
}: Readonly<Props>) {
  const [dateParam, setDateParam] = useQueryState('date', parseAsString)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const selectedDate = dateParam
    ? new Date(`${dateParam}T00:00:00`)
    : new Date()

  const handleDateChange = (date: Date | undefined) => {
    if (!date) {
      return
    }
    if (isToday(date)) {
      setDateParam(null)
    } else {
      setDateParam(format(date, 'yyyy-MM-dd'))
    }
  }

  const isTodayActive = !dateParam || isToday(selectedDate)
  const isYesterdayActive = dateParam != null && isYesterday(selectedDate)
  const isCustomDate = dateParam != null && !isTodayActive && !isYesterdayActive

  return (
    <div className="space-y-2">
      <div>
        <h1 className="font-heading font-medium text-2xl">Resumen del día</h1>
        <p className="text-muted-foreground text-sm">
          <FormattedDate
            date={selectedDate}
            options={{ year: 'numeric', month: 'long', day: 'numeric' }}
          />
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => setDateParam(null)}
          size="xs"
          variant={isTodayActive ? 'secondary' : 'outline'}
        >
          Hoy
        </Button>
        <Button
          onClick={() => handleDateChange(subDays(new Date(), 1))}
          size="xs"
          variant={isYesterdayActive ? 'secondary' : 'outline'}
        >
          Ayer
        </Button>
        <Popover onOpenChange={setCalendarOpen} open={calendarOpen}>
          <PopoverTrigger asChild>
            <Button size="xs" variant={isCustomDate ? 'secondary' : 'outline'}>
              <HugeiconsIcon
                data-icon="inline-start"
                icon={Calendar03Icon}
                strokeWidth={2}
              />
              {isCustomDate
                ? format(selectedDate, 'dd MMM yyyy', { locale: es })
                : 'Elegir fecha'}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar
              autoFocus
              defaultMonth={selectedDate}
              disabled={{ after: new Date() }}
              locale={es}
              mode="single"
              onSelect={(date) => {
                handleDateChange(date)
                setCalendarOpen(false)
              }}
              selected={selectedDate}
            />
          </PopoverContent>
        </Popover>

        {isTodayActive && (
          <>
            <Button onClick={onRefresh} size="xs" variant="outline">
              <HugeiconsIcon
                data-icon="inline-start"
                icon={Refresh01FreeIcons}
                strokeWidth={2}
              />
              Actualizar
            </Button>
            <small className="text-muted-foreground text-xs">
              Ultima actualización:{' '}
              <FormattedDate date={new Date(dataUpdatedAt)} />
            </small>
          </>
        )}
      </div>
    </div>
  )
}
