import { api } from '@cetus/api-client'
import type { Order } from '@cetus/api-client/types/orders'
import type { PaymentLinkReasons } from '@cetus/api-client/types/payment-links'
import { Button } from '@cetus/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import { Skeleton } from '@cetus/ui/skeleton'
import { CopiableInput } from '@cetus/web/components/copiable-input'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { Field, FieldLabel } from '@cetus/web/components/ui/field'
import {
  calculateTotalQuantity,
  formatPhoneForWhatsApp,
  formatTimeRemaining,
  generateWhatsAppMessage,
} from '@cetus/web/features/payment-links/utils/payment-link-helpers'
import {
  Link04Icon,
  Loading03Icon,
  WhatsappIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import { useNumberFormatter } from 'react-aria'
import { toast } from 'sonner'

const paymentLinkReasons: Record<PaymentLinkReasons, string> = {
  order_cancelled: 'Orden cancelada',
  order_already_paid: 'Orden pagada',
  active_link_exists: 'Ya existe un link activo',
}

type Props = {
  order: Order
}

export function OrderPaymentLinkDialog({ order }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['orders', order.id, 'payment-link'],
    queryFn: () => api.paymentLinks.getState(order.id),
  })

  const queryClient = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationKey: ['orders', order.id, 'payment-link'],
    mutationFn: api.paymentLinks.create,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orders', order.id, 'payment-link'],
      })
    },
    onError: (error) => {
      toast.error(`Ha ocurrido un error al generar el link. ${error.message}`)
    },
  })

  const generatePaymentLink = useCallback(() => {
    mutate({
      orderId: order.id,
    })
  }, [mutate, order.id])

  const formatter = useNumberFormatter({
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  })

  const handleCopyToClipboard = useCallback(() => {
    if (!data?.activeLink?.url) {
      return
    }

    navigator.clipboard
      .writeText(data.activeLink.url)
      .then(() => toast.success('Link copiado al portapapeles'))
      .catch(() => toast.error('Error al copiar el link'))
  }, [data?.activeLink?.url])

  const remainingTime = useMemo(() => {
    if (data?.activeLink) {
      return formatTimeRemaining(data.activeLink.expiresAt)
    }

    return 'Desconocido'
  }, [data])

  const whatsappUrl = useMemo(() => {
    if (!(data?.activeLink && order.customer.phone)) {
      return ''
    }

    const totalQuantity = calculateTotalQuantity(order.items)
    const formattedPhone = formatPhoneForWhatsApp(order.customer.phone)
    const message = generateWhatsAppMessage({
      customerName: order.customer.name,
      totalQuantity,
      total: formatter.format(order.total),
      paymentUrl: data.activeLink.url,
      remainingTime,
    })

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
  }, [data?.activeLink, order, formatter, remainingTime])

  if (isLoading) {
    return <Skeleton className="h-8 w-32" />
  }

  if (!data) {
    return (
      <Button disabled variant="outline">
        <HugeiconsIcon data-icon="inline-start" icon={Link04Icon} />
        Link de pago
      </Button>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <HugeiconsIcon data-icon="inline-start" icon={Link04Icon} />
          Link de pago
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de pago</DialogTitle>
        </DialogHeader>

        {data.canGenerateLink && (
          <div>
            <p className="mb-4">
              Puedes generar un link de pago para que el cliente pueda completar
              su compra.
            </p>
            <Button disabled={isPending} onClick={generatePaymentLink}>
              {isPending && (
                <HugeiconsIcon className="animate-spin" icon={Loading03Icon} />
              )}
              Generar link de pago
            </Button>
          </div>
        )}

        {!data.canGenerateLink && data.activeLink && (
          <div className="flex flex-col gap-4">
            <div>
              <p>Link activo</p>
              <span className="text-muted-foreground text-xs">
                Vence el{' '}
                <FormattedDate date={new Date(data.activeLink.expiresAt)} />
              </span>
              <span className="block text-muted-foreground text-xs">
                En {remainingTime}
              </span>
            </div>

            <Field>
              <FieldLabel>URL del link de pago</FieldLabel>
              <CopiableInput value={data.activeLink.url} />
            </Field>

            <div className="flex flex-col gap-2">
              {order.customer.phone && whatsappUrl && (
                <Button asChild variant="default">
                  <a
                    href={whatsappUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <HugeiconsIcon
                      data-icon="inline-start"
                      icon={WhatsappIcon}
                    />
                    Enviar por WhatsApp
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {!(data.canGenerateLink || data.activeLink) && data.reason && (
          <div>
            <p>No se puede generar un link de pago.</p>
            <p className="font-medium text-sm">
              Razón: {paymentLinkReasons[data.reason]}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
