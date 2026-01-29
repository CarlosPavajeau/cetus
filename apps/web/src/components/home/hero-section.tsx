import { Button } from '@cetus/ui/button'
import {
  ArrowRight01Icon,
  DeliveryBox01Icon,
  SaleTag01Icon,
  SparklesIcon,
  StarIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'

export function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-primary/5 via-primary/10 to-primary/5">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute top-1/4 right-1/4 h-2 w-2 animate-pulse rounded-full bg-primary/40" />
      <div className="absolute bottom-1/3 left-1/3 h-3 w-3 animate-pulse rounded-full bg-primary/30 delay-300" />

      <div className="relative z-10 flex min-h-80 flex-col items-center justify-between gap-8 px-6 py-10 md:min-h-95 md:flex-row md:gap-12 md:px-12 lg:px-16">
        <div className="flex max-w-xl flex-col items-center text-center md:items-start md:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-sm">
            <HugeiconsIcon className="h-4 w-4" icon={SparklesIcon} />
            <span className="font-medium">Nuevos productos cada semana</span>
          </div>

          <h1 className="mb-4 font-bold font-heading text-3xl leading-tight tracking-tight md:text-4xl lg:text-5xl">
            Encuentra todo lo que
            <span className="text-primary"> necesitas</span>
          </h1>

          <p className="mb-6 max-w-md text-muted-foreground md:text-lg">
            Explora nuestra colección de productos de alta calidad con los
            mejores precios y envío rápido a toda Colombia.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild className="group" size="lg">
              <Link to="/products/all">
                Explorar productos
                <HugeiconsIcon
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-1"
                  data-icon="inline-end"
                  icon={ArrowRight01Icon}
                />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/products/all">Ver ofertas</Link>
            </Button>
          </div>
        </div>

        <div className="relative hidden md:block">
          <div className="relative h-64 w-64 lg:h-72 lg:w-72">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white shadow-xl lg:h-36 lg:w-36">
                <HugeiconsIcon
                  className="h-16 w-16 text-primary lg:h-20 lg:w-20"
                  icon={DeliveryBox01Icon}
                />
              </div>
            </div>

            <div className="absolute top-8 -left-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <HugeiconsIcon
                  className="h-4 w-4 text-amber-500"
                  icon={StarIcon}
                />
              </div>
              <div>
                <p className="font-semibold text-xs">4.9/5</p>
                <p className="text-muted-foreground text-xs">Rating</p>
              </div>
            </div>

            <div className="absolute -right-4 bottom-12 flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <HugeiconsIcon
                  className="h-4 w-4 text-emerald-500"
                  icon={SaleTag01Icon}
                />
              </div>
              <div>
                <p className="font-semibold text-xs">Hasta 30%</p>
                <p className="text-muted-foreground text-xs">Descuento</p>
              </div>
            </div>

            <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-primary/20" />
            <div className="absolute top-0 right-4 h-3 w-3 rounded-full bg-primary/30" />
          </div>
        </div>
      </div>
    </div>
  )
}
