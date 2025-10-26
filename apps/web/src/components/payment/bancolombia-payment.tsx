import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useForm } from 'react-hook-form'
import type { Order } from '@/api/orders'
import { BancolombiaLogo } from '@/components/icons'
import { PaymentConsent } from '@/components/payment/payment-consent'
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
import { Form } from '@/components/ui/form'
import { useCreateTransaction } from '@/hooks/payments'
import { PaymentSchema } from '@/schemas/payments'

type Props = {
  order: Order
  publicKey: string
}

export const BancolombiaPayment = ({ order, publicKey }: Props) => {
  const form = useForm({
    resolver: arktypeResolver(PaymentSchema),
    defaultValues: {
      type: 'BANCOLOMBIA_TRANSFER',
      acceptance_token: '',
      presigned_acceptance: true,
      presigned_personal_data_auth: true,
    },
  })

  const transactionMutation = useCreateTransaction(order, publicKey)

  const handleSubmit = form.handleSubmit(async (data) => {
    await transactionMutation.mutateAsync(data)
  })

  return (
    <Form {...form}>
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
              <PaymentConsent hideConsent publicKey={publicKey} />
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
    </Form>
  )
}
