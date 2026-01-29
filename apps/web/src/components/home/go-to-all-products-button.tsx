import { Button } from '@cetus/ui/button'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'

export function GoToAllProductsButton() {
  return (
    <Button asChild className="group" size="lg">
      <Link to="/products/all">
        Ver todos
        <HugeiconsIcon
          aria-hidden="true"
          className="-me-1 h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5"
          icon={ArrowRight01Icon}
        />
      </Link>
    </Button>
  )
}
