import { Protect } from '@clerk/clerk-react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <section className="space-y-4">
      <Protect>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold font-heading text-2xl text-foreground">
              Pedidos
            </h1>

            <span className="text-muted-foreground text-sm">
              Aquí puedes ver los pedidos de tus clientes.
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold font-heading text-2xl text-foreground">
                En construcción
              </h1>

              <span className="text-muted-foreground text-sm">
                Esta página está en construcción.
              </span>
            </div>
          </div>
        </div>
      </Protect>
    </section>
  )
}
