import { Button } from '@/components/ui/button'
import { useCart } from '@/store/cart'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'

export const Route = createFileRoute('/cart/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { count, items } = useCart()

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
            <Link to="/" className="flex items-center gap-2">
              <h2 className="font-medium text-base leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Inicio
              </h2>
            </Link>
          </div>
        </div>
      </header>

      <main className="grow">
        <div data-home="true">
          <div className="max-w-3xl max-sm:text-center">
            <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
              Verifica los productos de tu carrito para continuar con tu pedido
            </h1>
          </div>

          <div className="relative my-16">
            <div className="grid grid-cols-1 gap-y-6 md:grid-cols-2">
              <div className="grid gap-4 md:border-border md:border-r md:pr-4">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="rounded-md border border-border bg-white p-4"
                  >
                    <div className="flex h-full flex-col justify-between *:not-first:mt-4">
                      <h2 className="font-medium text-base leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {item.product.name}
                      </h2>

                      <p className="text-[13px] text-muted-foreground">
                        {item.product.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <p className="font-bold text-base text-foreground">
                          ${item.product.price} x {item.quantity}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col justify-between space-y-8 md:pl-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <h2 className="font-medium text-2xl text-muted-foreground">
                      Total
                    </h2>
                    <h2 className="font-bold text-2xl text-foreground">
                      $
                      {items.reduce(
                        (acc, item) => acc + item.product.price * item.quantity,
                        0,
                      )}
                    </h2>
                  </div>

                  <div className="flex justify-between">
                    <h2 className="font-medium text-2xl text-muted-foreground">
                      Productos
                    </h2>
                    <h2 className="font-bold text-2xl text-foreground">
                      {count}
                    </h2>
                  </div>
                </div>

                <div>
                  <div className="my-4 rounded-lg border bg-background p-4">
                    <h2 className="font-medium text-lg">En construcción</h2>
                    <p className="text-muted-foreground">
                      Actualmente estamos trabajando en la integración de pagos
                      para que puedas realizar tus pedidos de forma segura y
                      rápida.
                    </p>
                  </div>
                  <Button className="group w-full">
                    Continuar con el pago
                    <ArrowRightIcon
                      className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                      size={16}
                      aria-hidden="true"
                    />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
