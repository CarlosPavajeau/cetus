import { Button } from '@cetus/ui/button'
import { Skeleton } from '@cetus/ui/skeleton'
import { CategoriesTable } from '@cetus/web/features/categories/components/categories-table'
import { CreateCategoryDialog } from '@cetus/web/features/categories/components/create-category.dialog'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/app/categories')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = useCategories()

  const [isOpenCreateCategory, setIsOpenCreateCategory] = useState(false)

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <h1 className="font-heading font-semibold text-xl">Categorías</h1>

        <CreateCategoryDialog
          onOpenChange={setIsOpenCreateCategory}
          open={isOpenCreateCategory}
        />

        <Button onClick={() => setIsOpenCreateCategory(true)}>
          Agregar categoría
        </Button>
      </div>

      {isLoading && <Skeleton className="h-10 w-full" />}
      {!isLoading && <CategoriesTable categories={data} />}
    </div>
  )
}
