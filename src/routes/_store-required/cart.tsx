import { Currency } from '@/components/currency'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/shared/cdn'
import { type CartItem, useCart } from '@/store/cart'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRightIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  Trash2Icon,
} from 'lucide-react'
import { useCallback, useMemo } from 'react'

export const Route = createFileRoute('/_store-required/cart')({
  component: CartPage,
})

function EmptyCart() {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 text-center"
      initial={{ opacity: 0 }}
    >
      <div className="mb-4 rounded-full bg-muted p-6">
        <ShoppingBagIcon className="text-muted-foreground" size={32} />
      </div>
      <h2 className="mb-2 font-semibold text-2xl">Tu carrito está vacío</h2>
      <p className="mb-6 max-w-md text-muted-foreground">
        Parece que aún no has agregado productos a tu carrito. Explora nuestra
        tienda para encontrar lo que necesitas.
      </p>
      <Button asChild>
        <Link to="/">
          <ShoppingCartIcon className="mr-2" />
          Explorar productos
        </Link>
      </Button>
    </motion.div>
  )
}

type CartItemProps = {
  item: CartItem
}

function CartItemComponent({ item }: CartItemProps) {
  const cart = useCart()

  const handleRemoveItem = useCallback(() => {
    cart.remove(item.product)
  }, [cart, item.product])

  const handleIncrement = useCallback(() => {
    cart.add(item.product)
  }, [cart, item.product])

  const handleDecrement = useCallback(() => {
    cart.reduce(item.product)
  }, [cart, item.product])

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex p-3">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            alt={item.product.name}
            className="object-cover"
            height={80}
            layout="constrained"
            objectFit="cover"
            sizes="80px"
            src={getImageUrl(item.product.imageUrl || '')}
            width={80}
          />
        </div>

        <div className="ml-3 flex flex-1 flex-col">
          <div className="flex justify-between">
            <h3 className="line-clamp-1 font-medium text-sm">
              {item.product.name}
            </h3>

            <button
              className="text-muted-foreground hover:text-red-500"
              onClick={handleRemoveItem}
              type="button"
            >
              <Trash2Icon className="h-4 w-4" />
            </button>
          </div>

          <span className="mt-1 font-medium text-xs">
            <Currency currency="COP" value={item.product.price} />
          </span>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center rounded-md border">
              <button
                className="p-1 text-muted-foreground"
                onClick={handleDecrement}
                type="button"
              >
                <MinusIcon className="h-4 w-4" />
              </button>
              <span className="px-2 text-sm">{item.quantity}</span>
              <button
                className="p-1 text-muted-foreground"
                onClick={handleIncrement}
                type="button"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>

            <span className="font-medium text-sm">
              <Currency
                currency="COP"
                value={item.product.price * item.quantity}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartPage() {
  const cart = useCart()
  const isEmpty = cart.count === 0
  const total = useMemo(
    () =>
      cart.items.reduce(
        (acc, item) => acc + item.product.price * item.quantity,
        0,
      ),
    [cart.items],
  )

  if (isEmpty) {
    return (
      <DefaultPageLayout>
        <EmptyCart />
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <PageHeader title="Tu carrito de compras" />

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <div className="space-y-6">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <CartItemComponent item={item} key={item.product.id} />
              ))}
            </div>

            <div className="space-y-3 rounded-md border bg-card p-4">
              <h3 className="font-medium">Resumen del pedido</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>

                  <span>
                    <Currency currency="COP" value={total} />
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envio</span>

                  <span>
                    <Currency currency="COP" value={5000} /> -{' '}
                    <Currency currency="COP" value={15_000} />
                  </span>
                </div>

                <div className="mt-2 flex justify-between border-t pt-2 font-medium">
                  <span>Total</span>
                  <span>
                    <Currency currency="COP" value={total} />
                  </span>
                </div>

                <div>
                  <small className="text-muted-foreground text-xs">
                    El costo del envio es cancelado al momento de la entrega de
                    los productos.
                  </small>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="group w-full">
                <Link to="/checkout">
                  Continuar con el pago
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
                    size={16}
                  />
                </Link>
              </Button>

              <Button asChild className="w-full" variant="outline">
                <Link to="/">
                  <ShoppingCartIcon className="mr-2" />
                  Seguir comprando
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </DefaultPageLayout>
  )
}
