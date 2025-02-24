import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useProducts } from '@/hooks/use-products'
import { Link, createFileRoute } from '@tanstack/react-router'
import { DollarSignIcon, PackageIcon, ShoppingCartIcon } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { products, isLoading } = useProducts()

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
            <Link to="/app" className="flex items-center gap-2">
              <span className="inline-flex gap-0.5 text-sm hover:underline">
                Aplicación
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="grow">
        <div data-home="true">
          <div className="max-w-3xl max-sm:text-center">
            <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
              Selecciona un producto para iniciar tu pedido
            </h1>
          </div>

          <div className="relative my-16">
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {isLoading && <p>Cargando...</p>}
              {products?.map((product) => (
                <div
                  key={product.id}
                  className="max-w-sm rounded-md border border-border bg-white p-4"
                >
                  <div className="flex h-full flex-col justify-between *:not-first:mt-4">
                    <h2 className="font-medium text-base leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {product.name}
                    </h2>

                    {product.description && (
                      <p className="text-[13px] text-muted-foreground">
                        {product.description}
                      </p>
                    )}

                    <div className="w-full">
                      <div className="flex items-center space-x-2">
                        <Badge>
                          <DollarSignIcon
                            className="-ms-0.5 opacity-60"
                            size={12}
                            aria-hidden="true"
                          />
                          {product.price}
                        </Badge>

                        <Badge>
                          <PackageIcon
                            className="-ms-0.5 opacity-60"
                            size={12}
                            aria-hidden="true"
                          />
                          {product.stock}
                        </Badge>
                      </div>
                      <Button className="mt-4 w-full">
                        <ShoppingCartIcon
                          className="-ms-1 opacity-60"
                          size={16}
                          aria-hidden="true"
                        />
                        Agregar al carrito
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
