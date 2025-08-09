import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'

export function ApplicationHome() {
  return (
    <main className="overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 isolate hidden opacity-65 contain-strict lg:block"
      >
        <div className="-translate-y-87.5 -rotate-45 absolute top-0 left-0 h-320 w-140 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
        <div className="-rotate-45 absolute top-0 left-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
        <div className="-translate-y-87.5 -rotate-45 absolute top-0 left-0 h-320 w-60 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
      </div>

      <section>
        <div className="relative pt-24 md:pt-36">
          <div className="-z-10 absolute inset-0 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]" />
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center sm:mx-auto lg:mt-0 lg:mr-auto">
              <h1 className="text-balance font-heading text-4xl md:text-7xl lg:mt-16 xl:text-[5.25rem]">
                Vende en línea más rápido y sin complicaciones
              </h1>

              <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground">
                Cetus es la plataforma e-commerce diseñada para que cualquiera
                pueda empezar a vender en minutos. Crea tu tienda, gestiona tu
                inventario y recibe pagos con MercadoPago, todo desde un sistema
                ágil, fácil de usar y más económico que el resto.
              </p>

              <div className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
                <Button asChild className="px-5 text-base" size="lg">
                  <Link to="/sign-up">
                    <span className="text-nowrap">Empieza gratis hoy</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
