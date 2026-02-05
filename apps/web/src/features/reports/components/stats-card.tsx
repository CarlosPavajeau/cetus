import { Card, CardContent } from '@cetus/ui/card'
import { CountingNumber } from '@cetus/ui/counting-number'
import { cn } from '@cetus/web/shared/utils'

type Props = {
  title: string
  value: string | number
  className?: string
  format?: (value: number) => string
}

export function StatsCard({ title, value, format, className }: Props) {
  const numValue = typeof value === 'number' ? value : Number.parseFloat(value)

  return (
    <Card className={cn('w-full', className)}>
      <CardContent>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-muted-foreground text-sm">{title}</p>
            <p className="mt-1 font-bold font-mono text-3xl">
              <CountingNumber
                duration={0.5}
                format={format}
                from={0}
                to={Number.isNaN(numValue) ? 0 : numValue}
              />
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
