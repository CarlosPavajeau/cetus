import type { ProductForSale } from '@/api/products'
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
import { ContentLayout } from './content-layout'
import { Currency } from './currency'
import { DefaultPageLayout } from './default-page-layout'
import { Image } from './image'
import { ProductAddedNotification } from './product-added-notification'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

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
      cart.add(product, quantity)
      setIsAddingToCart(false)

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

  // Mobile add to cart component
  const MobileControls = () => (
    <div className="mt-6 flex flex-col gap-4 lg:hidden">
      {product.stock > 0 && (
        <div className="flex items-center gap-4">
          <span className="font-medium">Cantidad:</span>
          <QuantitySelector
            quantity={quantity}
            onIncrement={incrementQuantity}
            onDecrement={decrementQuantity}
            max={maxQuantity}
          />
        </div>
      )}
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
  )

  return (
    <DefaultPageLayout showCart>
      <title>{`${product.name} | TELEDIGITAL JYA`}</title>
      <div>
        <nav className="mb-6 flex items-center space-x-1 text-muted-foreground text-sm">
          <Link to="/" className="flex items-center hover:text-foreground">
            <ArrowLeftIcon size={14} className="mr-1" />
            Volver a productos
          </Link>
        </nav>

        <AnimatePresence mode="wait">
          <ContentLayout>
            <motion.div
              className="space-y-4"
              key={`image-${product.id}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="sticky top-4">
                <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted/50">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image
                      src={getImageUrl(product.imageUrl || 'placeholder.svg')}
                      alt={product.name}
                      layout="fill"
                      className="object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Display stock indicator on mobile */}
                <div className="mt-4 flex lg:hidden">
                  <div className="flex w-full items-center justify-between">
                    <StockIndicator stock={product.stock} />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="space-y-6"
              key={`details-${product.id}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h1 className="font-bold text-3xl tracking-tight">
                    {product.name}
                  </h1>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="font-bold text-3xl">
                    <Currency value={product.price} currency="COP" />
                  </p>
                  <div className="hidden lg:block">
                    <StockIndicator stock={product.stock} />
                  </div>
                </div>
              </div>

              {product.description && (
                <div className="mt-6 space-y-4">
                  <h2 className="font-medium text-lg">Descripción</h2>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              )}

              {/* Mobile controls at the end */}
              <div className="mt-auto">
                <MobileControls />
              </div>

              {/* Desktop product actions */}
              <div className="hidden lg:block">
                <div className="my-6 h-px w-full bg-border"></div>

                <AnimatePresence>
                  {!isOutOfStock && (
                    <motion.div
                      className="space-y-6"
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

                <div className="mt-6 flex flex-col gap-4 sm:flex-row">
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
                        {isOutOfStock
                          ? 'Producto agotado'
                          : 'Agregar al carrito'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </ContentLayout>
        </AnimatePresence>
      </div>
    </DefaultPageLayout>
  )
})

ProductDisplay.displayName = 'ProductDisplay'
