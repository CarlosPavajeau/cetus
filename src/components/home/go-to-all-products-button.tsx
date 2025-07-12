import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'

export function GoToAllProductsButton() {
  return (
    <Button size="lg" className="group" asChild>
      <Link to="/products/all">
        Ver todos
        <ArrowRightIcon
          className="-me-1 opacity-60 transition-transform group-hover:translate-x-0.5"
          size={16}
          aria-hidden="true"
        />
      </Link>
    </Button>
  )
}
