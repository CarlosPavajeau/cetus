import { Button } from '@/components/ui/button'
import { useCanGoBack, useRouter } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

type Props = ComponentProps<typeof Button>

export function ReturnButton(props: Props) {
  const router = useRouter()
  const canGoBack = useCanGoBack()

  const handleBack = () => {
    router.history.back()
  }

  if (!canGoBack) {
    return null
  }

  return (
    <Button
      variant="ghost"
      className="text-muted-foreground"
      onClick={handleBack}
      {...props}
    >
      <ArrowLeftIcon size={14} />
      Volver
    </Button>
  )
}
