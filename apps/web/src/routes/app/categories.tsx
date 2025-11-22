import { Button } from '@cetus/ui/button'
import { CategoriesTable } from '@cetus/web/features/categories/components/categories-table'
import { CreateCategoryDialog } from '@cetus/web/features/categories/components/create-category.dialog'
import { useCategories } from '@cetus/web/features/categories/hooks/use-categories'
import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/categories')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = useCategories()

  const [isOpenCreateCategory, setIsOpenCreateCategory] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading font-semibold text-2xl">Categorías</h1>

        <CreateCategoryDialog
          onOpenChange={setIsOpenCreateCategory}
          open={isOpenCreateCategory}
        />

        <Button
          className="ml-auto"
          onClick={() => setIsOpenCreateCategory(true)}
        >
          <PlusIcon aria-hidden="true" className="-ms-1 opacity-60" size={16} />
          Crear categoria
        </Button>
      </div>

      <CategoriesTable categories={data} isLoading={isLoading} />
    </div>
  )
}
