import type { ProductForSale } from '@/api/products'
import { Currency } from '@/components/currency'
import { Image } from '@/components/image'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/shared/cdn'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import { LoaderCircleIcon } from 'lucide-react'
import { memo, useState } from 'react'
import { toast } from 'sonner'
import { ProductAddedNotification } from './product-added-notification'

type Props = {
  product: ProductForSale
}

function ProductCardComponent({ product }: Props) {
  const cart = useCart()
  const [isAddingToCart, setIsAddingToCart] = useState(false)

  const handleAddToCart = () => {
    setIsAddingToCart(true)

    // Simulate a small delay for better UX
    setTimeout(() => {
      const success = cart.add(product)
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
  }

  return (
    <div className="overflow-hidden rounded-lg border transition-shadow hover:shadow-md">
      <Link to="/products/$id" params={{ id: product.id }} className="block">
        <div className="relative aspect-square">
          <Image
            src={getImageUrl(product.imageUrl || 'placeholder.svg')}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFdwI2QOQvhwAAAABJRU5ErkJggg=="
          />
        </div>
      </Link>
      <div className="p-4">
        <Link to="/products/$id" params={{ id: product.id }} className="block">
          <h3 className="line-clamp-1 font-medium hover:underline">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {product.category}
          </span>
          <span className="font-semibold">
            <Currency value={product.price} currency="COP" />
          </span>
        </div>
        <Button
          className="mt-4 w-full"
          onClick={handleAddToCart}
          disabled={isAddingToCart}
        >
          {isAddingToCart ? (
            <>
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              Agregando...
            </>
          ) : (
            'Añadir al carrito'
          )}
        </Button>
      </div>
    </div>
  )
}

export const ProductCard = memo(ProductCardComponent)
