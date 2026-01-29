import { Button } from '@cetus/ui/button'
import { cn } from '@cetus/web/shared/utils'
import { useCart } from '@cetus/web/store/cart'
import { ShoppingBag01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const CartButton = () => {
  const { count } = useCart()
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (count > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [count])

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
          className={cn(
            'h-5 w-5 transition-transform',
            isAnimating && 'scale-110',
          )}
          icon={ShoppingBag01Icon}
        />
        {count > 0 && (
          <span
            className={cn(
              'absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-medium text-primary-foreground text-xs',
              isAnimating && 'animate-bounce',
            )}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  )
}
