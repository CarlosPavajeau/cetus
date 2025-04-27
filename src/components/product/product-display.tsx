import type { ProductForSale } from '@/api/products'
import { Currency } from '@/components/currency'
import { Image } from '@/components/image'
import { ProductAddedNotification } from '@/components/product/product-added-notification'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/shared/cdn'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import { memo, useCallback, useMemo, useState } from 'react'
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
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-r-none border-r-0"
          disabled={quantity <= 1}
          onClick={onDecrement}
          aria-label="Reducir cantidad"
        >
          <MinusIcon className="h-4 w-4" />
        </Button>
        <div className="flex h-9 w-12 items-center justify-center border">
          <span className="font-medium">{quantity}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-l-none border-l-0"
          aria-label="Aumentar cantidad"
          onClick={onIncrement}
          disabled={isMaxReached}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
    )
  },
)

QuantitySelector.displayName = 'QuantitySelector'

interface StockIndicatorProps {
  stock: number
}

const StockIndicator = memo(({ stock }: StockIndicatorProps) => {
  const stockStatus = useMemo(() => {
    if (stock <= 0)
      return { label: 'Agotado', variant: 'destructive' as const, icon: false }
    if (stock < 10)
      return {
        label: 'Pocas unidades',
        variant: 'destructive' as const,
        icon: true,
      }
    return { label: 'En existencia', variant: 'default' as const, icon: true }
  }, [stock])

  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant={stockStatus.variant}
        className={!stockStatus.icon ? 'opacity-80' : ''}
      >
        {stockStatus.icon && (
          <PackageIcon size={12} className="mr-1 opacity-80" />
        )}
        {stockStatus.label}
      </Badge>
      {stock > 0 && (
        <span className="text-muted-foreground text-sm">
          ({stock} {stock === 1 ? 'unidad' : 'unidades'})
        </span>
      )}
    </div>
  )
})

StockIndicator.displayName = 'StockIndicator'

function ProductGallery({ product }: Props) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-square overflow-hidden rounded-lg bg-background"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Image
          src={getImageUrl(product.imageUrl || 'placeholder.svg')}
          objectFit="cover"
          alt={product.name}
          layout="fill"
          className={`h-full w-full object-cover transition-transform duration-500 ease-out ${isHovered ? 'scale-110' : 'scale-100'}`}
          priority
        />
      </div>
    </div>
  )
}

function ProductInfo({ product }: Props) {
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
  const maxQuantity = product.stock

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <div className="mb-2">
          <StockIndicator stock={product.stock} />
        </div>

        <h1 className="font-bold text-2xl md:text-3xl">{product.name}</h1>

        {product.category && (
          <div className="mt-1 flex items-center text-muted-foreground text-sm">
            <span>Categoría: {product.category}</span>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center">
          <span className="font-bold text-3xl">
            <Currency value={product.price} currency="COP" />
          </span>
        </div>
      </div>

      <p className="mb-6 text-muted-foreground">{product.description}</p>

      <div className="mb-6">
        <QuantitySelector
          quantity={quantity}
          onIncrement={incrementQuantity}
          onDecrement={decrementQuantity}
          max={maxQuantity}
        />
      </div>

      <div className="mb-6">
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
  )
}

export const ProductDisplay = memo(({ product }: Props) => {
  return (
    <div>
      <title>{`${product.name} | TELEDIGITAL JYA`}</title>

      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link to="/">
            <ArrowLeftIcon size={14} />
            Volver
          </Link>
        </Button>
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-2 lg:gap-x-8">
        <div className="lg:col-span-1">
          <ProductGallery product={product} />
        </div>

        <div className="mt-10 px-4 sm:px-0 lg:col-span-1 lg:mt-0">
          <ProductInfo product={product} />
        </div>
      </div>
    </div>
  )
})

ProductDisplay.displayName = 'ProductDisplay'
