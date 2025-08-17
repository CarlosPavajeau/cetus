import { Button } from '@/components/ui/button'
import { HeadsetIcon } from 'lucide-react'

type Props = {
  message: string
}

export function SupportButton({ message }: Readonly<Props>) {
  return (
    <Button asChild className="w-full">
      <a
        href={`https://wa.me/573233125221?text=${encodeURIComponent(message)}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <HeadsetIcon />
        Soporte
      </a>
    </Button>
  )
}
