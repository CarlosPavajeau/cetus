import { ReviewRequestStatus } from '@/api/reviews'
import { DefaultLoader } from '@/components/default-loader'
import { DefaultPageLayout } from '@/components/default-page-layout'
import Image from '@/components/image'
import { PageHeader } from '@/components/page-header'
import { ProductReviewForm } from '@/components/reviews/product-review-form'
import { Button } from '@/components/ui/button'
import { useReviewRequest } from '@/hooks/reviews'
import { getImageUrl } from '@/shared/cdn'
import { createFileRoute, Link } from '@tanstack/react-router'
import { type } from 'arktype'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  Home,
  ShoppingBagIcon,
} from 'lucide-react'

const ReviewRequestSearchSchema = type({
  token: 'string',
})

export const Route = createFileRoute('/reviews/new')({
  component: RouteComponent,
  validateSearch: ReviewRequestSearchSchema,
})

function RouteComponent() {
  const { token } = Route.useSearch()

  const { reviewRequest, isLoading, error } = useReviewRequest(token)

  if (isLoading) {
    return (
      <DefaultPageLayout>
        <DefaultLoader />
      </DefaultPageLayout>
    )
  }

  if (error || !reviewRequest) {
    return (
      <DefaultPageLayout>
        <PageHeader
          title="Error al cargar la solicitud de reseña"
          subtitle="Por favor, inténtalo de nuevo más tarde."
        />

        <Button asChild>
          <Link to="/">
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Link>
        </Button>
      </DefaultPageLayout>
    )
  }

  if (reviewRequest.status === ReviewRequestStatus.Completed) {
    return (
      <DefaultPageLayout>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 rounded-full bg-success-lighter p-6">
            <CheckCircleIcon size={32} className="text-success-base" />
          </div>

          <PageHeader title="¡Reseña enviada!" />
          <p className="mb-2 text-muted-foreground">
            Tu reseña ha sido enviada y se encuentra en revisión.
          </p>

          <p className="mb-6 max-w-md text-muted-foreground">
            Gracias por tu preferencia.
          </p>

          <Button asChild className="w-full max-w-xs">
            <Link to="/">
              <ShoppingBagIcon />
              Seguir comprando
            </Link>
          </Button>
        </div>
      </DefaultPageLayout>
    )
  }

  if (reviewRequest.status === ReviewRequestStatus.Expired) {
    return (
      <DefaultPageLayout>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 rounded-full bg-warning-lighter p-6">
            <AlertTriangleIcon size={32} className="text-warning-base" />
          </div>

          <PageHeader title="Reseña expirada" />

          <p className="mb-6 max-w-md text-muted-foreground">
            Tu solicitud de reseña ha expirado.
          </p>

          <Button asChild className="w-full max-w-xs">
            <Link to="/">
              <ShoppingBagIcon />
              Seguir comprando
            </Link>
          </Button>
        </div>
      </DefaultPageLayout>
    )
  }

  return (
    <DefaultPageLayout>
      <PageHeader title="Escribe tu reseña" />

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-medium text-muted-foreground text-sm">
          Reseña para
        </h3>
        <div className="flex items-start gap-3">
          <Image
            src={getImageUrl(reviewRequest.product.imageUrl)}
            alt={reviewRequest.product.name}
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm leading-tight">
              {reviewRequest.product.name}
            </h4>
            {reviewRequest.customer && (
              <p className="mt-1 text-muted-foreground text-xs">
                Cliente: {reviewRequest.customer}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <ProductReviewForm reviewRequestId={reviewRequest.id} />
      </div>
    </DefaultPageLayout>
  )
}
