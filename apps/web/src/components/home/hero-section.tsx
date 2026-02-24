import { Button } from '@cetus/ui/button'
import type { PanelSnapshot } from '@cetus/web/shared/home/constants'
import { Link } from '@tanstack/react-router'
import { LiveDashboardPanel } from './live-dashboard-panel'

type Props = {
  panelData: PanelSnapshot
}

export function HeroSection({ panelData }: Props) {
  return (
    <section
      className="grid items-center gap-10 border-white/10 border-b pb-16 lg:grid-cols-[1.1fr_0.9fr]"
      id="about"
    >
      <div className="space-y-6">
        <p className="inline-flex items-center gap-2 rounded-md border border-border bg-accent px-3 py-1 font-medium text-foreground text-xs uppercase tracking-wide">
          Plataforma SaaS para e-commerce
        </p>
        <h1 className="max-w-3xl font-semibold text-4xl text-foreground leading-tight tracking-tight sm:text-6xl">
          Centraliza canales, pedidos y utilidad en un panel operativo.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg">
          Integra WhatsApp, Messenger y tienda web en minutos. Controla
          inventarios, automatiza pedidos y descubre que Canal te deja más
          margen desde la primera semana.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            asChild
            className="h-10 transition-all hover:-translate-y-0.5"
          >
            <Link to="/sign-up">
              <span className="text-nowrap">Comenzar gratis</span>
            </Link>
          </Button>

          <Button className="h-10" disabled variant="outline">
            Ver demo en vivo
          </Button>
        </div>
        <div className="space-y-1 text-muted-foreground text-sm">
          <p>Sin tarjeta de crédito. Configuración inicial en 7 minutos.</p>
        </div>
      </div>

      <LiveDashboardPanel panelData={panelData} />
    </section>
  )
}
