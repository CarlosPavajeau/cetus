import { DefaultPageLayout } from '@/components/default-page-layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/privacy')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DefaultPageLayout>
      <h1 className="mb-6 font-bold text-3xl">Política de Privacidad</h1>
      <p className="mb-4">
        Tu privacidad es importante para nosotros. Esta política de privacidad
        explica cómo recopilamos, usamos, divulgamos y protegemos tu información
        personal.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">
        1. Información que Recopilamos
      </h2>
      <p className="mb-4">
        Podemos recopilar información personal como tu nombre, dirección de
        correo electrónico, dirección postal, número de teléfono y detalles de
        pago cuando realizas una compra o te registras en nuestro sitio.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">
        2. Cómo Usamos tu Información
      </h2>
      <p className="mb-4">
        Utilizamos tu información para procesar pedidos, mejorar nuestros
        servicios, comunicarnos contigo y personalizar tu experiencia de compra.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">
        3. Compartir Información
      </h2>
      <p className="mb-4">
        No vendemos ni alquilamos tu información personal a terceros. Podemos
        compartir tu información con proveedores de servicios que nos ayudan a
        operar nuestro negocio.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">4. Seguridad</h2>
      <p>
        Implementamos medidas de seguridad para proteger tu información personal
        contra acceso no autorizado, alteración, divulgación o destrucción.
      </p>
    </DefaultPageLayout>
  )
}
