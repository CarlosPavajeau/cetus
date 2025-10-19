import { HeadsetIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTenantStore } from '@/store/use-tenant-store'

type Props = {
  message: string
}

export function SupportButton({ message }: Readonly<Props>) {
  const { store } = useTenantStore()

  if (!store) {
    return null
  }

  if (!store.phone) {
    return (
      <div className="flex flex-col items-center">
        <Button disabled>
          <HeadsetIcon />
          Soporte
        </Button>

        <span className="text-muted-foreground text-sm">
          No hay información de contacto disponible.
        </span>
      </div>
    )
  }

  return (
    <Button asChild className="w-full">
      <a
        href={`https://wa.me/57${store.phone}?text=${encodeURIComponent(message)}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <HeadsetIcon />
        Soporte
      </a>
    </Button>
  )
}
