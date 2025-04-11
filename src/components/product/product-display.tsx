import type { ProductForSale } from '@/api/products'
import { ContentLayout } from '@/components/content-layout'
import { Currency } from '@/components/currency'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { Image } from '@/components/image'
import { ProductAddedNotification } from '@/components/product/product-added-notification'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/shared/cdn'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
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

export const ProductDisplay = memo(({ product }: Props) => {
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
    <DefaultPageLayout showCart>
      <title>{`${product.name} | TELEDIGITAL JYA`}</title>

      <div className="mb-6">
        <Button asChild variant="ghost" className="text-muted-foreground">
          <Link to="/">
            <ArrowLeftIcon size={14} />
            Volver
          </Link>
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <ContentLayout>
          <motion.div
            key={`image-${product.id}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="max-h-2xl max-w-2xl"
          >
            <div className="relative">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-background">
                <Image
                  src={getImageUrl(product.imageUrl || 'placeholder.svg')}
                  objectFit="cover"
                  alt={product.name}
                  layout="fill"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="mb-6 space-y-4"
            key={`details-${product.id}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <StockIndicator stock={product.stock} />

            <div>
              <h1 className="mt-2 font-bold text-2xl sm:text-3xl">
                {product.name}
              </h1>

              <p className="mt-2 font-bold text-2xl">
                <Currency value={product.price} currency="COP" />
              </p>
            </div>

            {product.description && (
              <div className="mt-4">
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Desktop product actions */}
            <div className="mt-12 space-y-6">
              <AnimatePresence>
                {!isOutOfStock && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">Cantidad:</span>
                      <QuantitySelector
                        quantity={quantity}
                        onIncrement={incrementQuantity}
                        onDecrement={decrementQuantity}
                        max={maxQuantity}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-4 sm:flex-row">
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
          </motion.div>
        </ContentLayout>
      </AnimatePresence>
    </DefaultPageLayout>
  )
})

ProductDisplay.displayName = 'ProductDisplay'
