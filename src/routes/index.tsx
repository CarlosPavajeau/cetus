import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  return (
    <div className="container mx-auto">
      <h1 className="font-bold text-3xl">Main page</h1>
    </div>
  )
}
