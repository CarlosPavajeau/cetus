import type { ProductForSale } from '@/api/products'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import { PackageIcon, ShoppingCart } from 'lucide-react'
import { Currency } from './currency'
import { Image } from './image'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type Props = {
  products: ProductForSale[]
}

export const ProductGrid = ({ products }: Props) => {
  const cart = useCart()

  const cdnUrl = import.meta.env.PUBLIC_CDN_URL

  const getImageUrl = (image: string) => `${cdnUrl}/${image}`

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="flex h-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground"
        >
          <div className="relative aspect-square">
            <Link to={`/products/${product.id}`}>
              <Image
                src={getImageUrl(product.imageUrl || 'placeholder.svg')}
                alt={product.name}
                layout="fill"
                className="object-cover transition-transform hover:scale-105"
              />
            </Link>
          </div>

          <div className="flex-grow p-6 pt-4">
            <div className="mb-2">
              <Badge className="font-normal" variant="outline">
                <PackageIcon
                  className="-ms-0.5 opacity-60"
                  size={12}
                  aria-hidden="true"
                />
                {product.stock}
              </Badge>
            </div>
            <Link to={`/products/${product.id}`} className="hover:underline">
              <h3 className="line-clamp-1 font-medium text-lg">
                {product.name}
              </h3>
            </Link>
            <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
              {product.description}
            </p>
          </div>

          <div className="flex items-center justify-between p-6 pt-0">
            <div className="font-semibold">
              <Currency value={product.price} currency="COP" />
            </div>
            <Button size="icon" onClick={() => cart.add(product)}>
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
