import { useCategories } from '@/hooks/use-categories'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { categories, isLoading, error } = useCategories()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return (
    <div className="container mx-auto">
      <h1 className="font-bold text-3xl">Categorias</h1>
      <ul>
        {categories?.map((category) => (
          <li key={category.id}>{category.name}</li>
        ))}
      </ul>
    </div>
  )
}
