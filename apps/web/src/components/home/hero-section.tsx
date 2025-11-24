import { GoToAllProductsButton } from '@cetus/web/components/home/go-to-all-products-button'
import { ShoppingBagIcon } from 'lucide-react'

export function HeroSection() {
  return (
    <div className="mb-8 flex min-w-full flex-col-reverse items-center justify-between rounded-xl bg-muted px-5 py-8 md:flex-row md:px-14">
      <div className="mt-10 md:mt-0 md:pl-8">
        <p className="pb-1 font-heading text-primary md:text-base">
          Descubre productos exclusivos ¡diseñados especialmente para ti!
        </p>

        <h1 className="max-w-lg font-heading font-semibold text-2xl md:text-[40px] md:leading-[48px]">
          Descubre nuestro catalogo de productos únicos
        </h1>

        <div className="mt-4 flex items-center md:mt-6">
          <GoToAllProductsButton />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <ShoppingBagIcon className="-rotate-15 size-32" />
      </div>
    </div>
  )
}
