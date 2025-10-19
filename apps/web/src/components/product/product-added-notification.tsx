import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, CircleCheckIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = {
  productName: string
  onClose: () => void
}

export function ProductAddedNotification({
  productName,
  onClose,
}: Readonly<Props>) {
  return (
    <div className="z-50 max-w-[400px] rounded-md border bg-background px-4 py-3 shadow-lg">
      <div className="flex gap-2">
        <div className="flex grow gap-3">
          <CircleCheckIcon
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-emerald-500"
            size={16}
          />
          <div className="flex grow justify-between gap-12">
            <p className="text-sm">
              <span className="font-medium">{productName}</span> ha sido añadido
              al carrito
            </p>
            <Link
              className="group whitespace-nowrap font-medium text-sm"
              to="/cart"
            >
              Ver
              <ArrowRightIcon
                aria-hidden="true"
                className="-mt-0.5 ms-1 inline-flex opacity-60 transition-transform group-hover:translate-x-0.5"
                size={16}
              />
            </Link>
          </div>
        </div>
        <Button
          aria-label="Close banner"
          className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
          onClick={onClose}
          variant="ghost"
        >
          <XIcon
            aria-hidden="true"
            className="opacity-60 transition-opacity group-hover:opacity-100"
            size={16}
          />
        </Button>
      </div>
    </div>
  )
}
