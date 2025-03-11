import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, CircleCheckIcon, XIcon } from 'lucide-react'
import { Button } from './ui/button'

type Props = {
  productName: string
  onClose: () => void
}

export function ProductAddedNotification({ productName, onClose }: Props) {
  return (
    <div className="z-50 max-w-[400px] rounded-md border bg-background px-4 py-3 shadow-lg">
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
            <Link
              to="/cart"
              className="group whitespace-nowrap font-medium text-sm"
            >
              Ver
              <ArrowRightIcon
                className="-mt-0.5 ms-1 inline-flex opacity-60 transition-transform group-hover:translate-x-0.5"
                size={16}
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
        <Button
          variant="ghost"
          className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
          aria-label="Close banner"
          onClick={onClose}
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
