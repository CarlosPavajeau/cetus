import { useCart } from '@/store/cart'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/orders/$orderId/confirmation')({
  component: RouteComponent,
})

function RouteComponent() {
  const { clear } = useCart()

  useEffect(() => {
    clear()
  }, [clear])

  return (
    <main className="grow">
      <div>
        <div data-home="true">
          <div className="max-w-3xl max-sm:text-center">
            <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
              ¡Gracias por tu compra!
            </h1>

            <p className="text-muted-foreground">
              Tu pedido ha sido confirmado. Pronto recibirás un correo
              electrónico con los detalles de tu compra.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
