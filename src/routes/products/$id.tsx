import { CartButton } from '@/components/cart-button'
import { ProductDisplay } from '@/components/product-display'
import { useProduct } from '@/hooks/use-product'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/products/$id')({
  component: RouteComponent,
})

function RouteComponent() {
  const params = Route.useParams()
  const id = params.id

  const { product } = useProduct(id)

  return (
    <>
      <header className="before:-inset-x-32 relative mb-14 before:absolute before:bottom-0 before:h-px before:bg-[linear-gradient(to_right,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))]">
        <div
          className="before:-bottom-px before:-left-12 before:-ml-px after:-right-12 after:-bottom-px after:-mr-px before:absolute before:z-10 before:size-[3px] before:bg-ring/50 after:absolute after:z-10 after:size-[3px] after:bg-ring/50"
          aria-label="hidden"
        ></div>

        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <h1 className="font-bold font-heading text-2xl text-foreground">
              Cetus
            </h1>
          </Link>

          <div className="flex items-center gap-4 sm:gap-8">
            <CartButton />
          </div>
        </div>
      </header>

      <main className="grow">
        {product && <ProductDisplay product={product} />}
      </main>
    </>
  )
}
