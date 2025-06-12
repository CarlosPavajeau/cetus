import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProductReviews } from '@/hooks/reviews'
import { InfoIcon } from 'lucide-react'
import { ProductReview } from './product-review'

type Props = {
  id: string
}

export function ProductTabs({ id }: Props) {
  const { productReviews, isLoading } = useProductReviews(id)

  if (isLoading) {
    return (
      <div>
        <Tabs defaultValue="reviews">
          <TabsList className="grid h-auto rounded-none border-b bg-transparent p-0">
            <TabsTrigger
              value="reviews"
              className="relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
            >
              <Skeleton className="h-6 w-24" />
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="reviews"
            className="data-[state=active]:fade-in h-72 max-h-72 min-h-72 overflow-y-auto rounded border bg-card p-4 data-[state=active]:animate-in data-[state=active]:duration-300 data-[state=active]:ease-in"
          >
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  if (!productReviews || productReviews.length === 0) {
    return (
      <Alert>
        <InfoIcon />
        <AlertTitle>No hay reseñas</AlertTitle>
        <AlertDescription>Este producto aún no tiene reseñas.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div>
      <Tabs defaultValue="reviews">
        <TabsList className="grid h-auto rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="reviews"
            className="relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
          >
            Reseñas {productReviews.length > 0 && `(${productReviews.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="reviews"
          className="data-[state=active]:fade-in h-72 max-h-72 min-h-72 overflow-y-auto rounded border bg-card p-4 data-[state=active]:animate-in data-[state=active]:duration-300 data-[state=active]:ease-in"
        >
          <div>
            {productReviews.map((review) => (
              <ProductReview key={review.id} review={review} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
