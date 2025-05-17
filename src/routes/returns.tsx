import { DefaultPageLayout } from '@/components/default-page-layout'
import { SupportButton } from '@/components/support-button'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/returns')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DefaultPageLayout>
      <h1 className="mb-6 font-bold text-3xl">Política de Garantía</h1>
      <p className="mb-4">
        En <span className="font-medium">TELEDIGITAL JYA</span> nos
        comprometemos a brindar una garantía rápida y eficiente para asegurar la
        satisfacción de nuestros clientes. A continuación, te detallamos los
        términos de nuestra política de garantía:
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">1. Plazo de garantía</h2>
      <p className="mb-4">
        El cliente dispone de un máximo de 24 horas desde la fecha de compra
        para realizar cualquier reclamación de garantía.
      </p>
      <p className="mb-4">
        Recomendamos que el producto sea devuelto al detectar algún problema
        para agilizar el proceso de garantía.
      </p>
      <p className="mb-4 font-bold uppercase">
        Productos rotos no tienen garantía.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">
        2. Condiciones de la garantía
      </h2>
      <p className="mb-4">
        EL producto debe ser devuelto en perfecto estado, sin señales de uso o
        daño que no correspondan a la garantía.
      </p>
      <p className="mb-4">
        Es imprescindible que el cliente presente la caja original del producto
        en buen estado y con todos los accesorios y documentos incluidos al
        momento de la compra.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">
        3. Exclusiones de la garantía
      </h2>
      <p className="mb-4">
        No se aceptarán productos que presenten daños ocasionados por mal uso,
        negligencia o modificaciones no autorizadas.
      </p>
      <p className="mb-4">
        La garantía no cubre desgaste normal o daños accidentales.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">
        4. Proceso de garantía
      </h2>
      <p className="mb-4">
        Una vez que recibamos el productor de manera presencial, nuestro equipo
        realizará una revisión técnica para verificar que cumple con las
        condiciones de la garantía.
      </p>
      <p className="mb-4">
        Si el producto cumple con las condiciones, se ofrecerá una reparación o
        cambio por un producto nuevo, según corresponda.
      </p>

      <h2 className="mt-6 mb-3 font-semibold text-xl">5. Recomendaciones</h2>
      <p className="mb-4">
        Para evitar inconvenientes, sugerimos conservar la caja, los accesoriosy
        todos los documentos de compra.
      </p>
      <p className="mb-4">
        Ante cualquier duda o inconveniente, recomendamos contactar a nuestro
        equipo de soporte para recibir asistencia personalizada.
      </p>

      <div className="mt-6">
        <SupportButton message="Hola, necesito ayuda con la garantía de un producto." />
      </div>
    </DefaultPageLayout>
  )
}
