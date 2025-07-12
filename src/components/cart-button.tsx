import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCart } from '@/store/cart'
import { Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'

export const CartButton = () => {
  const { count } = useCart()

  return (
    <Button
      variant="outline"
      size="icon"
      className="relative"
      aria-label="shopping cart"
      asChild
    >
      <Link to="/cart">
        <ShoppingCartIcon size={16} aria-hidden="true" />
        {count > 0 && (
          <Badge className="-top-2 -translate-x-1/2 absolute left-full min-w-5 px-1">
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </Link>
    </Button>
  )
}
