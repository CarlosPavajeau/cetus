import { api } from '@cetus/api-client'
import type { PendingForApprovalProductReview } from '@cetus/api-client/types/reviews'
import { getImageUrl } from '@cetus/shared/utils/image'
import { Button } from '@cetus/ui/button'
import DialogContent, {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { Textarea } from '@cetus/ui/textarea'
import { StarRating } from '@cetus/web/features/products/components/star-rating'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Image } from '@unpic/react'
import { FileSearchIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type Props = {
  review: PendingForApprovalProductReview
}

export function ProcessReviewDialog({ review }: Readonly<Props>) {
  const [isOpen, setIsOpen] = useState(false)
  const [moderatorNotes, setModeratorNotes] = useState('')
  const queryClient = useQueryClient()

  const approveMutation = useMutation({
    mutationKey: ['reviews', 'approve', review.id],
    mutationFn: api.reviews.approve,
    onSuccess: () => {
      toast.success('Reseña aprobada correctamente')
      queryClient.invalidateQueries({
        queryKey: ['pending-for-approval-product-reviews'],
      })
    },
  })

  const rejectMutation = useMutation({
    mutationKey: ['reviews', 'reject', review.id],
    mutationFn: api.reviews.reject,
    onSuccess: () => {
      toast.success('Reseña rechazada correctamente')
      queryClient.invalidateQueries({
        queryKey: ['pending-for-approval-product-reviews'],
      })
    },
  })

  const handleApprove = () => {
    approveMutation.mutate(review.id)
  }

  const handleReject = () => {
    if (!moderatorNotes.trim()) {
      toast.error('Por favor, proporciona una razón para rechazar la reseña')
      return
    }

    rejectMutation.mutate({
      id: review.id,
      moderatorNotes: moderatorNotes.trim(),
    })
  }

  const isProcessing = approveMutation.isPending || rejectMutation.isPending

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <FileSearchIcon />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revisar reseña de {review.customer}</DialogTitle>
          <DialogDescription>
            Aquí puedes aprobar o rechazar la reseña del producto.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <FieldGroup>
            <div className="flex items-start gap-4 rounded-lg bg-secondary p-2">
              <Image
                alt={review.product.name}
                className="size-20 rounded-lg object-cover"
                height={80}
                layout="constrained"
                objectFit="cover"
                src={getImageUrl(review.product.imageUrl)}
                width={80}
              />
              <div>
                <h3 className="font-medium text-base">{review.product.name}</h3>

                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-sm">Calificación:</p>
                  <StarRating
                    className="gap-1"
                    rating={review.rating}
                    size={3}
                  />
                </div>

                <p className="text-muted-foreground text-sm">
                  Comentario: {review.comment}
                </p>
              </div>
            </div>

            <Field>
              <FieldLabel>
                Razón para rechazar la reseña (obligatorio si rechazas):
              </FieldLabel>

              <Textarea
                className="min-h-[100px] resize-none"
                id="moderatorNotes"
                onChange={(e) => setModeratorNotes(e.target.value)}
                placeholder="Escribe las razones para rechazar la reseña..."
                value={moderatorNotes}
              />
            </Field>
          </FieldGroup>
        </DialogBody>

        <DialogFooter>
          <Button
            disabled={isProcessing}
            onClick={handleReject}
            variant="outline"
          >
            Rechazar
          </Button>
          <Button disabled={isProcessing} onClick={handleApprove}>
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
