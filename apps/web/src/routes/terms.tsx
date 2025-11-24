import { DefaultPageLayout } from '@cetus/web/components/default-page-layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/terms')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DefaultPageLayout>
      <h1 className="mb-6 font-bold text-3xl">Términos y Condiciones</h1>
      <p className="mb-4">
        Al utilizar nuestro sitio web y servicios, aceptas cumplir con estos
        términos y condiciones. Por favor, léelos cuidadosamente.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">1. Uso del Sitio</h2>
      <p className="mb-4">
        El contenido de este sitio es únicamente para información general y uso
        personal. Está sujeto a cambios sin previo aviso.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">2. Privacidad</h2>
      <p className="mb-4">
        Tu uso de este sitio está sujeto a nuestra Política de Privacidad. Por
        favor, revisa nuestra política de privacidad para entender nuestras
        prácticas.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">3. Pedidos y Pagos</h2>
      <p className="mb-4">
        Al realizar un pedido, aceptas proporcionar información actual, completa
        y precisa para todas las compras. Nos reservamos el derecho de rechazar
        o cancelar cualquier pedido por cualquier motivo.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">4. Garantía</h2>
      <p>
        Para información sobre nuestra política de garantía, por favor visita
        nuestra sección de política de garantía.
      </p>
    </DefaultPageLayout>
  )
}
