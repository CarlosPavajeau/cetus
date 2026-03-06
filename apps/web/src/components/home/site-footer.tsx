import { Button } from '@cetus/ui/button'
import { Input } from '@cetus/ui/input'
import { Skeleton } from '@cetus/ui/skeleton'
import {
  getApiStatus,
  type StatusResponse,
} from '@cetus/web/functions/get-status'
import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'

const statusLabels: Record<StatusResponse['status'], string> = {
  operational: 'Operacional',
  degraded_performance: 'Desempeño Degradado',
  partial_outage: 'Corte Parcial',
  major_outage: 'Corte Mayor',
  under_maintenance: 'Mantenimiento',
  unknown: 'Desconocido',
  incident: 'Incidente',
}

const statusStyles: Record<StatusResponse['status'], string> = {
  operational: 'bg-emerald-400',
  degraded_performance: 'bg-orange-400',
  partial_outage: 'bg-yellow-400',
  major_outage: 'bg-red-400',
  under_maintenance: 'bg-slate-400',
  unknown: 'bg-gray-400',
  incident: 'bg-red-400',
}

export function SiteFooter() {
  const getStatus = useServerFn(getApiStatus)

  const { data, isLoading } = useQuery({
    queryKey: ['api-status'],
    queryFn: () => getStatus(),
  })

  return (
    <footer className="border-border border-t bg-card">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <p className="font-semibold text-foreground text-sm tracking-tight">
            Cetus
          </p>
          <p className="text-muted-foreground text-sm">
            Infraestructura SaaS para equipos que venden en multiples canales.
          </p>
          {isLoading ? (
            <Skeleton className="h-6.5 w-54.5" />
          ) : (
            <a
              aria-live="polite"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-foreground text-xs"
              href="https://cetus.openstatus.dev/"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="relative flex size-2">
                <span
                  className={`${statusStyles[data?.status ?? 'unknown']} absolute inline-flex h-full w-full animate-ping rounded-full opacity-70`}
                />
                <span
                  className={`${statusStyles[data?.status ?? 'unknown']} relative inline-flex size-2 rounded-full`}
                />
              </span>
              Estado del sistema:{' '}
              {data?.status ? statusLabels[data.status] : 'Desconocido'}
            </a>
          )}
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium text-foreground">Plataforma</p>
          <a
            className="block text-muted-foreground hover:text-foreground"
            href="#"
          >
            Integraciones
          </a>
          <a
            className="block text-muted-foreground hover:text-foreground"
            href="#"
          >
            Actualizaciones
          </a>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium text-foreground">Empresa</p>
          <a
            className="block text-muted-foreground hover:text-foreground"
            href="#"
          >
            Nosotros
          </a>
          <a
            className="block text-muted-foreground hover:text-foreground"
            href="#"
          >
            Clientes
          </a>
          <a
            className="block text-muted-foreground hover:text-foreground"
            href="#"
          >
            Contacto
          </a>
        </div>

        <div className="space-y-3">
          <p className="font-medium text-foreground text-sm">Newsletter</p>
          <p className="text-muted-foreground text-sm">
            Novedades de producto, mejoras y guias para vender mas.
          </p>
          <form aria-label="Suscripcion a newsletter" className="flex gap-2">
            <Input
              aria-label="Correo electronico"
              placeholder="nombre@empresa.com"
              type="email"
            />
            <Button variant="secondary">Suscribirme</Button>
          </form>
        </div>
      </div>
    </footer>
  )
}
