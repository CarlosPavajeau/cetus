import { Link } from '@tanstack/react-router'
import { CircleCheckIcon, XIcon } from 'lucide-react'
import { Button } from './ui/button'

type Props = {
  productName: string
  onClose: () => void
}

export function ProductAddedNotification({ productName, onClose }: Props) {
  return (
    <div className="w-full rounded-md border bg-background px-4 py-3 text-foreground shadow-lg sm:w-[var(--width)]">
      <div className="flex gap-2">
        <div className="flex grow gap-3">
          <CircleCheckIcon
            className="mt-0.5 shrink-0 text-emerald-500"
            size={16}
            aria-hidden="true"
          />

          <div className="flex grow justify-between gap-12">
            <p className="text-sm">
              <span className="font-medium">{productName}</span> ha sido añadido
              al carrito
            </p>

            <div className="whitespace-nowrap text-sm">
              <Link to="/cart" className="font-medium text-sm hover:underline">
                Ver
              </Link>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
          onClick={onClose}
          aria-label="Close banner"
        >
          <XIcon
            size={16}
            className="opacity-60 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  )
}
