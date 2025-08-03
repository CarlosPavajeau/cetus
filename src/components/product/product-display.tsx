import type { ProductForSale } from '@/api/products'
import { Currency } from '@/components/currency'
import { ProductAddedNotification } from '@/components/product/product-added-notification'
import { ProductImages } from '@/components/product/product-images'
import { ProductRating } from '@/components/product/product-rating'
import { ProductShare } from '@/components/product/product-share'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useCart } from '@/store/cart'
import { MinusIcon, PlusIcon, ShoppingCartIcon } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { toast } from 'sonner'

type QuantitySelectorProps = {
  quantity: number
  onIncrement: () => void
  onDecrement: () => void
  max?: number
}

const QuantitySelector = memo(
  ({
    quantity,
    onIncrement,
    onDecrement,
    max = Infinity,
  }: QuantitySelectorProps) => {
    const isMaxReached = max !== Infinity && quantity >= max

    return (
      <div className="flex items-center">
        <Label className="mr-2">Cantidad:</Label>
        <div className="flex items-center rounded-md border border-input">
          <button
            className="p-2 text-muted-foreground"
            onClick={onDecrement}
            disabled={quantity <= 1}
          >
            <MinusIcon className="h-4 w-4" />
          </button>
          <span className="px-4">{quantity}</span>
          <button
            className="p-2 text-muted-foreground"
            onClick={onIncrement}
            disabled={isMaxReached}
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {isMaxReached && (
          <span className="ml-4 text-red-500 text-sm">
            Máximo: {max} unidades
          </span>
        )}
      </div>
    )
  },
)

type Props = {
  product: ProductForSale
}

function ProductDisplayComponent({ product }: Props) {
  const cart = useCart()
  const [quantity, setQuantity] = useState(1)
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const incrementQuantity = useCallback(() => {
    setQuantity((prev) => prev + 1)
  }, [])

  const decrementQuantity = useCallback(() => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1))
  }, [])

  const handleAddToCart = useCallback(() => {
    setIsAddingToCart(true)

    // Simulate a small delay for better UX
    setTimeout(() => {
      const success = cart.add(product, quantity)
      setIsAddingToCart(false)

      if (!success) {
        toast.error('No hay suficiente stock')
        return
      }

      toast.custom((t) => (
        <ProductAddedNotification
          productName={product.name}
          onClose={() => toast.dismiss(t)}
        />
      ))
    }, 300)
  }, [cart, product, quantity])

  const isOutOfStock = product.stock <= 0

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <ProductImages product={product} />

      <div className="space-y-6">
        <div>
          <h1 className="mb-2 font-bold font-heading text-2xl lg:text-3xl">
            {product.name}
          </h1>

          <div className="mb-4 font-bold text-3xl">
            <Currency value={product.price} currency="COP" />
          </div>

          <div className="mb-4 flex items-center space-x-2">
            <ProductRating
              rating={product.rating}
              reviewsCount={product.reviewsCount}
            />
          </div>
        </div>

        <div className="text-muted-foreground leading-relaxed">
          <p>{product.description}</p>
        </div>

        <div className="space-y-4">
          <div>
            <QuantitySelector
              quantity={quantity}
              onIncrement={incrementQuantity}
              onDecrement={decrementQuantity}
              max={product.stock}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Button
                className="flex-1 gap-2"
                size="lg"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAddingToCart}
              >
                {isAddingToCart ? (
                  <div className="flex items-center">
                    <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Agregando...
                  </div>
                ) : (
                  <>
                    <ShoppingCartIcon className="mr-2 h-5 w-5" />
                    {isOutOfStock ? 'Producto agotado' : 'Agregar al carrito'}
                  </>
                )}
              </Button>

              <ProductShare productName={product.name} />
            </div>

            <span className="text-right text-muted-foreground text-xs">
              {product.stock} unidades restantes
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ProductDisplay = memo(({ product }: Props) => {
  return <ProductDisplayComponent product={product} />
})
