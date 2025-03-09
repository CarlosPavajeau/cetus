import type { ProductForSale } from '@/api/products'
import { getImageUrl } from '@/shared/cdn'
import { useCart } from '@/store/cart'
import { MinusIcon, PlusIcon, ShoppingCartIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ContentLayout } from './content-layout'
import { Currency } from './currency'
import { DefaultPageLayout } from './default-page-layout'
import { Image } from './image'
import { ProductAddedNotification } from './product-added-notification'
import { Button } from './ui/button'

type Props = {
  product: ProductForSale
}

export const ProductDisplay = ({ product }: Props) => {
  const cart = useCart()
  const [quantity, setQuantity] = useState(1)

  const incrementQuantity = () => {
    setQuantity((prev) => prev + 1)
  }

  const decrementQuantity = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1))
  }

  const handleAddToCart = (product: ProductForSale) => {
    cart.add(product, quantity)

    toast.custom((t) => (
      <ProductAddedNotification
        productName={product.name}
        onClose={() => toast.dismiss(t)}
      />
    ))
  }

  return (
    <DefaultPageLayout showCart>
      <ContentLayout>
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src={getImageUrl(product.imageUrl || 'placeholder.svg')}
                alt={product.name}
                layout="fill"
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="font-bold text-3xl tracking-tight">
              {product.name}
            </h1>
            <div className="mt-4 flex items-center">
              <p className="font-bold text-3xl">
                <Currency value={product.price} currency="COP" />
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground">{product.description}</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="font-medium">Cantidad:</span>
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  disabled={quantity <= 1}
                  onClick={decrementQuantity}
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="h-4 w-4" />
                </Button>
                <div className="flex h-8 w-12 items-center justify-center border-y">
                  {quantity}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  aria-label="Increase quantity"
                  onClick={incrementQuantity}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleAddToCart(product)}
              >
                <ShoppingCartIcon className="mr-2 h-5 w-5" />
                Agregar al carrito
              </Button>
            </div>
          </div>
        </div>
      </ContentLayout>
    </DefaultPageLayout>
  )
}
