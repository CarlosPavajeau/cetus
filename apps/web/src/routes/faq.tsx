import { createFileRoute } from '@tanstack/react-router'
import { DefaultPageLayout } from '@/components/default-page-layout'

export const Route = createFileRoute('/faq')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DefaultPageLayout>
      <h1 className="mb-6 font-bold text-3xl">Preguntas Frecuentes</h1>

      <div className="space-y-6">
        <div>
          <h2 className="mb-2 font-semibold text-xl">
            ¿Cuánto tiempo tarda el envío?
          </h2>
          <p>
            El tiempo de envío estándar es de 3-5 días hábiles dentro del país.
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-xl">
            ¿Cómo puedo contactar al servicio al cliente?
          </h2>
          <p>
            Puedes contactar a nuestro equipo de servicio al cliente por
            teléfono al +57 323 312 5221
          </p>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
