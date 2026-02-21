import type { PanelSnapshot } from '@cetus/web/shared/home/constants'
import { useNumberFormatter } from 'react-aria'
import { Button } from '../ui/button'
import { CountingNumber } from '../ui/counting-number'

type Props = {
  panelData: PanelSnapshot
}

export function LiveDashboardPanel({ panelData }: Props) {
  const currencyFormatter = useNumberFormatter({
    style: 'currency',
    currency: 'COP',
  })
  return (
    <div className="relative mx-auto h-88 w-full max-w-md rounded-md border border-border">
      <div className="h-full overflow-hidden p-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm tracking-tight">
              Resumen del día
            </h3>
            <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
              2 de febrero de 2026
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex gap-1.5">
          <Button size="xs" variant="secondary">
            Hoy
          </Button>
          <Button size="xs" variant="outline">
            Ayer
          </Button>
          <Button size="xs" variant="outline">
            02 feb 2026
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-border bg-card p-2.5">
            <p className="text-[0.65rem] text-muted-foreground">
              Ventas del día
            </p>
            <p className="mt-1 font-semibold text-base text-foreground">
              <CountingNumber duration={0.5} to={panelData.sales} />
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-2.5">
            <p className="text-[0.65rem] text-muted-foreground">
              Ingresos confirmados
            </p>
            <p className="mt-1 font-semibold text-base text-foreground">
              <CountingNumber
                duration={0.5}
                format={(value) => currencyFormatter.format(value)}
                to={panelData.confirmedRevenue}
              />
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-2.5">
            <p className="text-[0.65rem] text-muted-foreground">
              Ingresos pendientes
            </p>
            <p className="mt-1 font-semibold text-base text-foreground">
              <CountingNumber
                duration={0.5}
                format={(value) => currencyFormatter.format(value)}
                to={panelData.pendingRevenue}
              />
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-2.5">
            <p className="text-[0.65rem] text-muted-foreground">
              Ventas por cobrar
            </p>
            <p className="mt-1 font-semibold text-base text-foreground">
              <CountingNumber duration={0.5} to={panelData.receivableSales} />
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between border-border border-y py-2 text-[0.66rem] text-foreground">
          <p>
            Total del dia:{' '}
            <span className="font-medium text-foreground">
              {panelData.totalDay}
            </span>
          </p>
          <p>
            Tasa de confirmacion:{' '}
            <span className="font-medium text-foreground">
              {panelData.confirmationRate}
            </span>
          </p>
        </div>

        <div className="mt-2.5">
          <div className="flex items-center justify-between">
            <p className="font-medium text-[0.7rem] text-foreground">
              Ventas del dia (5)
            </p>
            <div className="flex gap-1">
              <Button size="xs" variant="secondary">
                Todas
              </Button>
              <Button size="xs" variant="outline">
                Pagadas
              </Button>
              <Button size="xs" variant="outline">
                Pendientes
              </Button>
            </div>
          </div>

          <div className="mt-2 rounded-lg border border-border px-2.5 py-2">
            <div className="flex items-center justify-between text-[0.7rem]">
              <p className="font-medium text-foreground">
                #140{' '}
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 ${panelData.orderStatusTone}`}
                >
                  {panelData.orderStatus}
                </span>
              </p>
              <p className="font-medium text-foreground">
                {panelData.orderTotal}
              </p>
            </div>
            <p className="mt-1 text-[0.64rem] text-muted-foreground">
              Valledupar, Cesar - 5:33 p.m.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
