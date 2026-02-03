import type { SimpleProductForSale } from '@cetus/api-client/types/products'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Badge } from '@cetus/web/components/ui/badge'
import { Currency } from '@cetus/web/components/currency'
import { StarRating } from '@cetus/web/features/products/components/star-rating'
import { cn } from '@cetus/web/shared/utils'
import { useCart } from '@cetus/web/store/cart'
import {
  FavouriteIcon,
  Loading03Icon,
  ShoppingCartAdd01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { memo, useCallback, useState } from 'react'
import { toast } from 'sonner'

type Props = {
  product: SimpleProductForSale
  variant?: 'default' | 'featured'
  showBadge?: 'featured' | 'popular' | 'sale' | 'new' | null
  // TODO: Implement discount logic in backend - originalPrice should come from API
  originalPrice?: number
  // TODO: Add stock to SimpleProductForSale in backend API
  stock?: number
}

function ProductCardComponent({
  product,
  variant = 'default',
  showBadge = null,
  originalPrice,
  stock = 99, // Default stock until backend provides it
}: Readonly<Props>) {
  const cart = useCart()
  const [isHovered, setIsHovered] = useState(false)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const hasDiscount = originalPrice && originalPrice > product.price
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (isAddingToCart || justAdded) return

      setIsAddingToCart(true)

      // Small delay for better UX
      setTimeout(() => {
        const success = cart.add(
          {
            productId: product.id,
            name: product.name,
            slug: product.slug,
            imageUrl: product.imageUrl || 'placeholder.svg',
            price: product.price,
            variantId: product.variantId,
            stock,
            // TODO: Add optionValues to SimpleProductForSale in backend
            optionValues: [],
          },
          1,
        )

        setIsAddingToCart(false)

        if (!success) {
          toast.error('No hay suficiente stock')
          return
        }

        setJustAdded(true)
        toast.success('Producto agregado al carrito')

        // Reset the "just added" state after 2 seconds
        setTimeout(() => setJustAdded(false), 2000)
      }, 300)
    },
    [cart, product, stock, isAddingToCart, justAdded],
  )

  const badgeConfig = {
    featured: { label: 'Destacado', className: 'bg-amber-500 text-white' },
    popular: { label: 'Popular', className: 'bg-blue-500 text-white' },
    sale: {
      label: `-${discountPercentage}%`,
      className: 'bg-red-500 text-white',
    },
    new: { label: 'Nuevo', className: 'bg-emerald-500 text-white' },
  }

  return (
    <Link
      params={{ slug: product.slug }}
      preload="intent"
      search={{ variant: product.variantId }}
      to="/products/$slug"
    >
      <div
        className={cn(
          'group overflow-hidden rounded-lg bg-card transition-all duration-300',
          'hover:shadow-black/5 hover:shadow-lg',
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden">
          <Image
            alt={product.name}
            background="auto"
            className={cn(
              'h-full w-full object-cover transition-transform duration-500',
              'group-hover:scale-110',
            )}
            height={400}
            layout="constrained"
            objectFit="cover"
            priority
            sizes="(max-width: 768px) 50vw, 33vw"
            src={getImageUrl(product.imageUrl || 'placeholder.svg')}
            width={400}
          />

          {(showBadge || hasDiscount) && (
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
              {hasDiscount && (
                <Badge className={badgeConfig.sale.className}>
                  {badgeConfig.sale.label}
                </Badge>
              )}
              {showBadge && !hasDiscount && (
                <Badge className={badgeConfig[showBadge].className}>
                  {badgeConfig[showBadge].label}
                </Badge>
              )}
            </div>
          )}

          <div
            className={cn(
              'absolute top-2 right-2 z-10 flex flex-col gap-2 transition-all duration-300',
              isHovered
                ? 'translate-x-0 opacity-100'
                : 'translate-x-4 opacity-0',
            )}
          >
            <button
              aria-label="Agregar a favoritos"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm transition-colors hover:bg-primary hover:text-white"
              onClick={(e) => {
                e.preventDefault()
                // TODO: Implement wishlist functionality
              }}
              type="button"
            >
              <HugeiconsIcon className="h-4 w-4" icon={FavouriteIcon} />
            </button>
            <button
              aria-label="Agregar al carrito"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-colors',
                justAdded
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/90 hover:bg-primary hover:text-white',
              )}
              disabled={isAddingToCart}
              onClick={handleAddToCart}
              type="button"
            >
              {isAddingToCart ? (
                <HugeiconsIcon
                  className="h-4 w-4 animate-spin"
                  icon={Loading03Icon}
                />
              ) : justAdded ? (
                <HugeiconsIcon className="h-4 w-4" icon={Tick01Icon} />
              ) : (
                <HugeiconsIcon
                  className="h-4 w-4"
                  icon={ShoppingCartAdd01Icon}
                />
              )}
            </button>
          </div>

          <div
            className={cn(
              'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent p-4 transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-0',
            )}
          />
        </div>

        <div className="p-3">
          <h3 className="line-clamp-2 min-h-[2.5rem] font-heading font-medium text-sm leading-tight md:text-base">
            {product.name}
          </h3>

          <div className="mt-1 flex items-center gap-1.5">
            <StarRating className="m-0 p-0" rating={product.rating} size={3} />
            <span className="text-muted-foreground text-xs">
              ({product.reviewsCount})
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'font-semibold text-base',
                hasDiscount && 'text-red-600',
              )}
            >
              <Currency currency="COP" value={product.price} />
            </span>
            {hasDiscount && (
              <span className="text-muted-foreground text-sm line-through">
                <Currency currency="COP" value={originalPrice} />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}

export const ProductCard = memo(ProductCardComponent)
