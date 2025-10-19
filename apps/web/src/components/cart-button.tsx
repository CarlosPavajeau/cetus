import { Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCart } from '@/store/cart'

export const CartButton = () => {
  const { count } = useCart()

  return (
    <Button
      aria-label="shopping cart"
      asChild
      className="relative"
      size="icon"
      variant="outline"
    >
      <Link to="/cart">
        <ShoppingCartIcon aria-hidden="true" size={16} />
        {count > 0 && (
          <Badge className="-top-2 -translate-x-1/2 absolute left-full min-w-5 px-1">
            {count > 99 ? '99+' : count}
          </Badge>
        )}
      </Link>
    </Button>
  )
}
