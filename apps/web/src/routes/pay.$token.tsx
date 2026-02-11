import { api } from '@cetus/api-client'
import type { PaymentLink } from '@cetus/api-client/types/payment-links'
import {
  Cancel01Icon,
  SentIcon,
  Timer02Icon,
  Unlink04Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { DefaultPageLayout } from '../components/default-page-layout'

export const Route = createFileRoute('/pay/$token')({
  loader: async ({ params }) => {
    const { token } = params
    const paymentLink = await api.paymentLinks.getByToken(token)
    const isActive =
      paymentLink.status === 'active' && paymentLink.timeRemaining > 0

    if (isActive) {
      throw redirect({
        to: '/checkout/$id',
        params: {
          id: paymentLink.orderId,
        },
      })
    }

    return { paymentLink }
  },
  component: RouteComponent,
  errorComponent: InvalidLinkView,
})

function InvalidLinkView() {
  return (
    <DefaultPageLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
        <div className="mb-6 rounded-2xl bg-destructive/10 p-5">
          <HugeiconsIcon
            className="text-destructive"
            icon={Unlink04Icon}
            size={28}
          />
        </div>

        <h2 className="mb-2 font-heading font-semibold text-2xl">
          Link de pago no válido
        </h2>

        <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
          El link de pago que estás intentando usar no existe o ya no está
          disponible.
        </p>
      </div>
    </DefaultPageLayout>
  )
}

function RouteComponent() {
  const { paymentLink } = Route.useLoaderData()

  return (
    <DefaultPageLayout>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center">
        <StatusDisplay paymentLink={paymentLink} />
      </div>
    </DefaultPageLayout>
  )
}

type StatusDisplayProps = {
  paymentLink: PaymentLink
}

function StatusDisplay({ paymentLink }: Readonly<StatusDisplayProps>) {
  if (paymentLink.status === 'paid') {
    return (
      <>
        <div className="mb-6 rounded-2xl bg-success-lighter p-5">
          <HugeiconsIcon
            className="text-success-base"
            icon={SentIcon}
            size={28}
          />
        </div>

        <h2 className="mb-2 font-heading font-semibold text-2xl">
          Este pago ya fue realizado
        </h2>

        <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
          El link de pago que estás usando ya fue utilizado para completar un
          pago exitosamente.
        </p>
      </>
    )
  }

  if (paymentLink.status === 'expired') {
    return (
      <>
        <div className="mb-6 rounded-2xl bg-warning-lighter p-5">
          <HugeiconsIcon
            className="text-warning-base"
            icon={Timer02Icon}
            size={28}
          />
        </div>

        <h2 className="mb-2 font-heading font-semibold text-2xl">
          Este link de pago ha expirado
        </h2>

        <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
          El tiempo para realizar el pago ha finalizado. Contacta al vendedor
          para solicitar un nuevo link.
        </p>
      </>
    )
  }

  // Active but timeRemaining <= 0 (expired in practice)
  return (
    <>
      <div className="mb-6 rounded-2xl bg-destructive/10 p-5">
        <HugeiconsIcon
          className="text-destructive"
          icon={Cancel01Icon}
          size={28}
        />
      </div>

      <h2 className="mb-2 font-heading font-semibold text-2xl">
        Link de pago no disponible
      </h2>

      <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
        Este link de pago ya no se encuentra disponible. Contacta al vendedor
        para más información.
      </p>
    </>
  )
}
