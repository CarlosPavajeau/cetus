import type { ProductForSale } from '@/api/products'
import { Currency } from '@/components/currency'
import { Image } from '@/components/image'
import { ProductAddedNotification } from '@/components/product/product-added-notification'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getImageUrl } from '@/shared/cdn'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  MinusIcon,
  PlusIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { Fragment, memo, useCallback, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  product: ProductForSale
}

interface QuantitySelectorProps {
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
        <span className="mr-4 font-medium text-sm">Cantidad:</span>
        <div className="flex items-center rounded-md border">
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
    <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
      <div className="relative aspect-square overflow-hidden rounded-lg border">
        <Image
          src={getImageUrl(product.imageUrl || 'placeholder.svg')}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>

      <div className="space-y-6">
        <div>
          <div className="space-y-2">
            <Badge variant="outline">{product.category}</Badge>
            <h1 className="font-bold text-2xl md:text-3xl">{product.name}</h1>
          </div>
          <div className="mt-4 font-bold text-2xl">
            <Currency value={product.price} currency="COP" />
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-2">
          {product.stock > 2 ? (
            <>
              <Badge
                variant="outline"
                className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900 dark:text-green-200"
              >
                En stock
              </Badge>
              <span className="text-muted-foreground text-sm">
                ({product.stock} unidades restantes)
              </span>
            </>
          ) : (
            <>
              <Badge
                variant="outline"
                className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
              >
                Pocas unidades
              </Badge>
              <span className="text-muted-foreground text-sm">
                ({product.stock} unidades restantes)
              </span>
            </>
          )}
        </div>

        <div className="prose prose-sm mb-6">
          <p>{product.description}</p>
        </div>

        <div className="mt-auto flex flex-col space-y-4">
          <QuantitySelector
            quantity={quantity}
            onIncrement={incrementQuantity}
            onDecrement={decrementQuantity}
            max={product.stock}
          />

          <Button
            className="w-full"
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
        </div>
      </div>
    </div>
  )
}

export const ProductDisplay = memo(({ product }: Props) => {
  return (
    <Fragment>
      <title>{`${product.name} | TELEDIGITAL JYA`}</title>

      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link to="/">
            <ArrowLeftIcon size={14} />
            Volver
          </Link>
        </Button>
      </div>

      <ProductDisplayComponent product={product} />
    </Fragment>
  )
})
