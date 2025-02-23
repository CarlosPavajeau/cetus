import { AppNav } from '@/components/app-nav'
import { useCategories } from '@/hooks/use-categories'
import { Protect } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { categories, isLoading, error } = useCategories()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <div className="container mx-auto">
      <AppNav />

      <Protect>
        <h1 className="font-bold text-3xl">Categorias</h1>
        <ul>
          {categories?.map((category) => (
            <li key={category.id}>{category.name}</li>
          ))}
        </ul>
      </Protect>
    </div>
  )
}
