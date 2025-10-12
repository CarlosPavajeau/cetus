import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { BookDashedIcon } from 'lucide-react'

export function NotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookDashedIcon />
        </EmptyMedia>
        <EmptyTitle>No encontrado</EmptyTitle>
        <EmptyDescription>
          La página que estás buscando no existe.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button onClick={() => window.history.back()}>Volver</Button>
        </div>
      </EmptyContent>
    </Empty>
  )
}
