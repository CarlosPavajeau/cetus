import { Button } from '@cetus/ui/button'
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
    <Button onClick={handleBack} size="sm" variant="ghost" {...props}>
      <ArrowLeftIcon className="h-4 w-4" />
      Volver
    </Button>
  )
}
