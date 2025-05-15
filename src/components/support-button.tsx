import { Button } from '@/components/ui/button'
import { HeadsetIcon } from 'lucide-react'

type Props = {
  message: string
}

export function SupportButton({ message }: Props) {
  return (
    <Button className="w-full" asChild>
      <a
        href={`https://wa.me/573233125221?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <HeadsetIcon />
        Soporte
      </a>
    </Button>
  )
}
