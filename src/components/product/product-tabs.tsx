import type { ProductReview as ProductReviewType } from '@/api/reviews'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InfoIcon } from 'lucide-react'
import { ProductReview } from './product-review'

type Props = {
  reviews: ProductReviewType[]
}

export function ProductTabs({ reviews }: Readonly<Props>) {
  if (reviews.length === 0) {
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
            className="relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
            value="reviews"
          >
            <div className="flex items-center gap-2">
              <span>Reseñas</span>
              <span className="-me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] font-medium text-[0.625rem] text-muted-foreground">
                {reviews.length}
              </span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          className="data-[state=active]:fade-in h-72 max-h-72 min-h-72 overflow-y-auto rounded border bg-card p-4 data-[state=active]:animate-in data-[state=active]:duration-300 data-[state=active]:ease-in"
          value="reviews"
        >
          <div className="flex flex-col gap-2">
            {reviews.map((review) => (
              <ProductReview key={review.id} review={review} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
