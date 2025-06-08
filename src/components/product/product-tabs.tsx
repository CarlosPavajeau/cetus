import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  description: string
  reviewsCount?: number
  className?: string
}

export function ProductTabs({
  description,
  reviewsCount = 0,
  className = '',
}: Props) {
  return (
    <div className={`mt-8 ${className}`}>
      <Tabs className="w-full" defaultValue="description">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-none border-b bg-transparent p-0">
          <TabsTrigger
            value="description"
            className="relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
          >
            Descripción
          </TabsTrigger>
          <TabsTrigger
            value="reviews"
            className="relative rounded-none py-2 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
          >
            Reseñas {reviewsCount > 0 && `(${reviewsCount})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="description"
          className="data-[state=active]:fade-in h-72 max-h-72 min-h-72 rounded border bg-card p-4 data-[state=active]:animate-in data-[state=active]:duration-300 data-[state=active]:ease-in"
        >
          <p>{description}</p>
        </TabsContent>

        <TabsContent
          value="reviews"
          className="data-[state=active]:fade-in h-72 max-h-72 min-h-72 rounded border bg-card p-4 data-[state=active]:animate-in data-[state=active]:duration-300 data-[state=active]:ease-in"
        >
          {reviewsCount === 0 ? (
            <p>No hay reseñas</p>
          ) : (
            <p>Lista de reseñas aquí</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
