import type { Order } from '@cetus/api-client/types/orders'
import { paymentSchema } from '@cetus/schemas/payment.schema'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import { FieldGroup } from '@cetus/ui/field'
import { Form } from '@cetus/ui/form'
import { BancolombiaLogo } from '@cetus/web/components/icons'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { PaymentConsent } from '@cetus/web/features/payments/components/payment-consent'
import { useCreateTransaction } from '@cetus/web/features/payments/hooks/use-create-transaction'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useForm } from 'react-hook-form'

type Props = {
  order: Order
  publicKey: string
  integritySecret: string
}

export const BancolombiaPayment = ({
  order,
  publicKey,
  integritySecret,
}: Props) => {
  const form = useForm({
    resolver: arktypeResolver(paymentSchema),
    defaultValues: {
      type: 'BANCOLOMBIA_TRANSFER',
      acceptance_token: '',
      presigned_acceptance: true,
      presigned_personal_data_auth: true,
    },
  })

  const transactionMutation = useCreateTransaction(order, integritySecret)

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
