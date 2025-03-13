import type { ProductForSale } from '@/api/products'
import { getImageUrl } from '@/shared/cdn'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { PackageIcon, ShoppingCart } from 'lucide-react'
import { memo, useCallback } from 'react'
import { toast } from 'sonner'
import { Currency } from './currency'
import { Image } from './image'
import { ProductAddedNotification } from './product-added-notification'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type ProductCardProps = {
  product: ProductForSale
  onAddToCart: (product: ProductForSale) => void
  index: number
}

const ProductCard = memo(function ProductCard({
  product,
  onAddToCart,
  index,
}: ProductCardProps) {
  const handleAddToCart = useCallback(() => {
    onAddToCart(product)
  }, [onAddToCart, product])

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        delay: index * 0.05,
      },
    },
  }

  const isLowStock = product.stock < 10 && product.stock > 0

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground"
    >
      <div className="relative aspect-square overflow-hidden">
        <Link to={`/products/${product.id}`} className="block h-full w-full">
          <Image
            src={getImageUrl(product.imageUrl || 'placeholder.svg')}
            alt={product.name}
            layout="fill"
            className="object-cover transition-transform hover:scale-105"
            priority
          />
        </Link>

        {isLowStock && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="destructive">¡Pocas unidades!</Badge>
          </div>
        )}
      </div>

      <div className="flex-grow p-6 pt-4">
        <div className="mb-2">
          <Badge className="font-normal" variant="outline">
            <PackageIcon
              className="-ms-0.5 opacity-60"
              size={12}
              aria-hidden="true"
            />
            {product.stock} unidades
          </Badge>
        </div>

        <Link to={`/products/${product.id}`} className="hover:underline">
          <h3 className="line-clamp-1 font-medium text-lg">{product.name}</h3>
        </Link>

        {product.description && (
          <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
            {product.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between p-6 pt-0">
        <div className="font-semibold">
          <Currency value={product.price} currency="COP" />
        </div>

        <Button size="icon" onClick={handleAddToCart}>
          <ShoppingCart className="h-4 w-4" />
          <span className="sr-only">Añadir al carrito</span>
        </Button>
      </div>
    </motion.div>
  )
})

const EmptyProductGrid = () => (
  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
    <div className="mb-4 rounded-full bg-muted p-3">
      <ShoppingCart size={24} className="text-muted-foreground" />
    </div>
    <h3 className="mb-2 font-medium text-lg">No hay productos disponibles</h3>
    <p className="mb-4 text-muted-foreground">
      Vuelve más tarde para encontrar productos interesantes.
    </p>
  </div>
)

type Props = {
  products: ProductForSale[]
}

export function ProductGrid({ products }: Props) {
  const cart = useCart()

  const handleAddToCart = useCallback(
    (product: ProductForSale) => {
      const success = cart.add(product)

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
    },
    [cart],
  )

  if (!products.length) {
    return <EmptyProductGrid />
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: 'beforeChildren',
        staggerChildren: 0.1,
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4"
    >
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
          index={index}
        />
      ))}
    </motion.div>
  )
}
