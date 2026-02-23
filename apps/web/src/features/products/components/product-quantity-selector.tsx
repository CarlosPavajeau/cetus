import type {
  ProductForSale,
  ProductVariantResponse,
} from '@cetus/api-client/types/products'
import { Button } from '@cetus/ui/button'
import { Currency } from '@cetus/web/components/currency'
import { useCart } from '@cetus/web/store/cart'
import {
  MinusSignIcon,
  PlusSignIcon,
  ShoppingBag01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import React from 'react'
import { toast } from 'sonner'

type Props = {
  product: ProductForSale
  variant: ProductVariantResponse
}

export function ProductQuantitySelector({ product, variant }: Props) {
  const cart = useCart()
  const [quantity, setQuantity] = React.useState(1)

  const addToCart = React.useCallback(() => {
    const success = cart.add(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        imageUrl: variant.images.at(0)?.imageUrl ?? 'placeholder.svg',
        price: variant.price,
        variantId: variant.id,
        stock: variant.stock,
        optionValues: variant.optionValues,
      },
      quantity,
    )

    if (!success) {
      toast.error('No hay suficiente stock')
      return
    }

    toast.success('Producto agregado al carrito', {
      duration: 3000,
    })
  }, [cart, product, variant, quantity])

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-12 items-center self-start rounded-lg border border-border bg-card">
          <button
            aria-label="Decrease quantity"
            className="flex h-full w-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            type="button"
          >
            <HugeiconsIcon className="size-4" icon={MinusSignIcon} />
          </button>
          <span className="flex w-10 items-center justify-center font-medium text-foreground text-sm">
            {quantity}
          </span>
          <button
            aria-label="Increase quantity"
            className="flex h-full w-10 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setQuantity(Math.min(variant.stock, quantity + 1))}
            type="button"
          >
            <HugeiconsIcon className="size-4" icon={PlusSignIcon} />
          </button>
        </div>

        <Button
          className="group h-12 w-full cursor-pointer rounded-lg px-4 font-semibold text-sm transition-all sm:w-auto sm:flex-1 sm:px-8 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
          onClick={addToCart}
          size="lg"
          type="button"
        >
          <HugeiconsIcon
            aria-hidden="true"
            className="size-4 shrink-0"
            icon={ShoppingBag01Icon}
          />
          Agregar al carrito —{' '}
          <Currency currency="COP" value={variant.price * quantity} />
        </Button>
      </div>
    </div>
  )
}
