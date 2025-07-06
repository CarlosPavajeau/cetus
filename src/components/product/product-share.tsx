import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  RiFacebookFill,
  RiInstagramLine,
  RiWhatsappLine,
} from '@remixicon/react'
import { useRouteContext, useRouterState } from '@tanstack/react-router'
import { Share2Icon } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  productName: string
  className?: string
}

export function ProductShare({ productName, className = '' }: Props) {
  const context = useRouteContext({
    from: '/products/$slug',
  })
  const location = useRouterState({ select: (s) => s.location })
  const productUrl = `${context.host}${location.href}`

  const shareUrls = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&t=${encodeURIComponent(productName)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${productName} - ${productUrl}`)}`,
    instagram: `https://instagram.com/`, // Instagram doesn't support direct sharing via URL
  }

  const handleShare = (platform: keyof typeof shareUrls) => {
    if (platform === 'instagram') {
      // Instagram doesn't support direct sharing via URL, so we'll just copy the URL
      navigator.clipboard.writeText(productUrl)
      toast.success('URL copiada al portapapeles. Compártela en Instagram.')
      return
    }

    window.open(shareUrls[platform], '_blank')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`h-10 w-10 ${className}`}
        >
          <Share2Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleShare('facebook')}>
          <RiFacebookFill className="h-4 w-4 text-[#1877F2]" />
          Compartir en Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
          <RiWhatsappLine className="h-4 w-4 text-[#25D366]" />
          Compartir en WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleShare('instagram')}>
          <RiInstagramLine className="h-4 w-4 text-[#E4405F]" />
          Compartir en Instagram
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
