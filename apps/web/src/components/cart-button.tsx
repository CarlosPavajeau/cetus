import { Button } from '@cetus/ui/button'
import { useCart } from '@cetus/web/store/cart'
import { ShoppingBag01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'

export const CartButton = () => {
  const { count } = useCart()

  return (
    <Button
      aria-label={`Carrito de compras${count > 0 ? `, ${count} productos` : ''}`}
      asChild
      className="group relative"
      size="icon"
      variant="outline"
    >
      <Link to="/cart">
        <HugeiconsIcon
          aria-hidden="true"
          className="h-5 w-5"
          icon={ShoppingBag01Icon}
        />
        {count > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-medium text-primary-foreground text-xs motion-safe:animate-cart-pop"
            key={count}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
