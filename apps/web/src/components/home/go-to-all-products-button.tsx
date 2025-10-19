import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function GoToAllProductsButton() {
  return (
    <Button asChild className="group" size="lg">
      <Link to="/products/all">
        Ver todos
        <ArrowRightIcon
          aria-hidden="true"
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
        />
      </Link>
    </Button>
  )
}
