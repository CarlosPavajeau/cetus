import { getImageUrl } from '@cetus/shared/utils/image'
import { Button } from '@cetus/ui/button'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { PageHeader } from '@cetus/web/components/page-header'
import { CreateProductReview } from '@cetus/web/features/reviews/components/create-product-review'
import { useReviewRequest } from '@cetus/web/features/reviews/hooks/use-review-request'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Image } from '@unpic/react'
import { type } from 'arktype'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  Home,
  ShoppingBagIcon,
} from 'lucide-react'

const reviewRequestSearchSchema = type({
  token: 'string',
})

export const Route = createFileRoute('/reviews/new')({
  component: RouteComponent,
  validateSearch: reviewRequestSearchSchema,
})

function RouteComponent() {
  const { token } = Route.useSearch()

  const { data: reviewRequest, isLoading, error } = useReviewRequest(token)

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
          subtitle="Por favor, inténtalo de nuevo más tarde."
          title="Error al cargar la solicitud de reseña"
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

  if (reviewRequest.status === 'completed') {
    return (
      <DefaultPageLayout>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 rounded-full bg-success-lighter p-6">
            <CheckCircleIcon className="text-success-base" size={32} />
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

  if (reviewRequest.status === 'expired') {
    return (
      <DefaultPageLayout>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-4 rounded-full bg-warning-lighter p-6">
            <AlertTriangleIcon className="text-warning-base" size={32} />
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
            alt={reviewRequest.product.name}
            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
            height={64}
            layout="constrained"
            objectFit="cover"
            src={getImageUrl(reviewRequest.product.imageUrl)}
            width={64}
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
        <CreateProductReview reviewRequestId={reviewRequest.id} />
      </div>
    </DefaultPageLayout>
  )
}
