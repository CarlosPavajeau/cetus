import { Button } from '@cetus/ui/button'
import { ZapIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'

// TODO: Implement promotional banners in the backend
// This should come from an API endpoint that returns active promotions
type PromoBanner = {
  id: string
  title: string
  subtitle: string
  ctaText: string
  ctaLink: string
  bgColor: string
  icon: 'flash' | 'tag' | 'clock'
  endsAt?: Date
}

// Fake data for demonstration - replace with API data
const FAKE_PROMO: PromoBanner = {
  id: 'promo-1',
  title: 'Ofertas de Temporada',
  subtitle: 'Hasta 30% de descuento en productos seleccionados',
  ctaText: 'Ver ofertas',
  ctaLink: '/products/all',
  bgColor: 'from-violet-600 to-indigo-600',
  icon: 'flash',
}

export function PromoBannerSection() {
  const promo = FAKE_PROMO

  return (
    <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-primary p-6 text-primary-foreground md:flex-row md:p-8">
      <div className="flex items-center gap-4 text-center md:text-left">
        <div className="hidden h-12 w-12 items-center justify-center rounded-full bg-primary-foreground/10 md:flex">
          <HugeiconsIcon icon={ZapIcon} />
        </div>
        <div>
          <h3 className="font-heading font-semibold text-lg md:text-xl">
            {promo.title}
          </h3>
          <p className="text-primary-foreground/80 text-sm">{promo.subtitle}</p>
        </div>
      </div>

      <Button asChild size="lg" variant="secondary">
        <Link to={promo.ctaLink}>{promo.ctaText}</Link>
      </Button>
    </div>
  )
}
