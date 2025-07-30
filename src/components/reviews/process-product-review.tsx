import type {
  PendingForApprovalProductReview,
  RejectProductReviewRequest,
} from '@/api/reviews'
import { approveProductReview, rejectProductReview } from '@/api/reviews'
import { FormattedDate } from '@/components/formatted-date'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getImageUrl } from '@/shared/cdn'
import { useQueryClient } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { CheckIcon, FileSearchIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { StarRating } from '../product/star-rating'

type Props = {
  review: PendingForApprovalProductReview
}

export function ProcessProductReview({ review }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [moderatorNotes, setModeratorNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const queryClient = useQueryClient()

  const handleApprove = async () => {
    try {
      setIsProcessing(true)
      await approveProductReview(review.id)
      setIsOpen(false)
      toast.success('Reseña aprobada correctamente')
      queryClient.invalidateQueries({
        queryKey: ['pending-for-approval-product-reviews'],
      })
    } catch (error) {
      console.error('Error approving review:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!moderatorNotes.trim()) {
      toast.error('Por favor, proporciona una razón para rechazar la reseña')
      return
    }

    try {
      setIsProcessing(true)
      const request: RejectProductReviewRequest = {
        id: review.id,
        moderatorNotes: moderatorNotes.trim(),
      }
      await rejectProductReview(request)
      setIsOpen(false)
      toast.success('Reseña rechazada correctamente')
      queryClient.invalidateQueries({
        queryKey: ['pending-for-approval-product-reviews'],
      })
    } catch (error) {
      console.error('Error rejecting review:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <FileSearchIcon />
          <span>Revisar reseña</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Revisión de reseña</SheetTitle>
        </SheetHeader>

        <div className="grid flex-1 auto-rows-min gap-6 px-4">
          <div className="flex items-start gap-4 rounded-lg bg-secondary p-4">
            <Image
              src={getImageUrl(review.product.imageUrl)}
              alt={review.product.name}
              className="size-20 rounded-lg object-cover"
              width={80}
              height={80}
              sizes="80px"
              layout="constrained"
              objectFit="cover"
              priority
            />
            <div className="space-y-1.5">
              <h3 className="font-medium text-base">{review.product.name}</h3>
              <p className="text-muted-foreground text-sm">
                Cliente: {review.customer}
              </p>
              <p className="text-muted-foreground text-sm">
                Fecha: <FormattedDate date={new Date(review.createdAt)} />
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <p className="font-medium text-sm">Calificación:</p>
              <StarRating rating={review.rating} className="gap-1" />
            </div>
            <div className="grid gap-2">
              <p className="font-medium text-sm">Comentario:</p>
              <p className="text-sm leading-relaxed">{review.comment}</p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="moderatorNotes" className="font-medium text-sm">
              Notas del moderador
              <span className="ml-1 text-muted-foreground">
                (requerido para rechazar)
              </span>
            </Label>
            <Textarea
              id="moderatorNotes"
              placeholder="Escribe las razones para rechazar la reseña..."
              value={moderatorNotes}
              onChange={(e) => setModeratorNotes(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>
        </div>

        <SheetFooter>
          <div className="flex gap-3">
            <Button
              onClick={handleApprove}
              disabled={isProcessing}
              className="flex-1"
            >
              <CheckIcon />
              Aprobar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing}
              className="flex-1"
            >
              <XIcon />
              Rechazar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
