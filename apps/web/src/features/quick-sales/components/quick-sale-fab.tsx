import { Button } from '@cetus/ui/button'
import { PlusIcon } from 'lucide-react'

type Props = {
  onClick: () => void
}

export function QuickSaleFab({ onClick }: Readonly<Props>) {
  return (
    <Button
      className="fixed right-6 bottom-6 z-40 size-14 rounded-full shadow-lg"
      onClick={onClick}
      size="icon-lg"
      type="button"
    >
      <PlusIcon className="size-6" />
      <span className="sr-only">Venta rápida</span>
    </Button>
  )
}
