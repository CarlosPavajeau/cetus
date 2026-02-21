import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function SiteFooter() {
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
          <output
            aria-live="polite"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1 text-foreground text-xs"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
            </span>
            Estado del sistema: Operativo
          </output>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-medium text-foreground">Plataforma</p>
          <a
            className="block text-muted-foreground hover:text-foreground"
            href="#"
          >
            Catalogo
          </a>
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
