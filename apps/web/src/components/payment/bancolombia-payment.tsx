import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { BancolombiaLogo } from '@/components/icons'
import { SubmitButton } from '@/components/submit-button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { FieldGroup } from '@/components/ui/field'
import { useCreateTransaction } from '@/hooks/payments'
import { useMerchant } from '@/hooks/wompi/use-merchant'
import { PaymentSchema } from '@/schemas/payments'

type Props = {
  order: Order
}

export const BancolombiaPayment = ({ order }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'BANCOLOMBIA_TRANSFER',
      acceptance_token: '',
      presigned_acceptance: true,
      presigned_personal_data_auth: true,
    },
  })

  const transactionMutation = useCreateTransaction(order, '')

  const { merchant } = useMerchant('')

  useEffect(() => {
    if (merchant?.data?.presigned_acceptance?.acceptance_token) {
      form.setValue(
        'acceptance_token',
        merchant.data.presigned_acceptance.acceptance_token,
        { shouldValidate: true },
      )
    }
  }, [merchant, form])

  const handleSubmit = form.handleSubmit(async (data) => {
    await transactionMutation.mutateAsync(data)
  })

  return (
    <form id="bancolombia-payment-form" onSubmit={handleSubmit}>
      <FieldGroup>
        <Empty className="p-0 md:p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BancolombiaLogo />
            </EmptyMedia>
            <EmptyTitle>Botón Bancolombia</EmptyTitle>
            <EmptyDescription>
              Realiza el pago de tu pedido a través de la plataforma
              Bancolombia.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <SubmitButton
              disabled={form.formState.isSubmitting}
              form="bancolombia-payment-form"
              isSubmitting={form.formState.isSubmitting}
              type="submit"
            >
              Pagar con Bancolombia
            </SubmitButton>
          </EmptyContent>
        </Empty>
      </FieldGroup>
    </form>
  )
}
