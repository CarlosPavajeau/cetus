import type { Order } from '@cetus/api-client/types/orders'
import { wompi } from '@cetus/integrations-wompi'
import type { CreateTransactionRequest } from '@cetus/integrations-wompi/types'
import type { paymentSchema } from '@cetus/schemas/payment.schema'
import { valueToCents } from '@cetus/web/shared/currency'
import { useGenerateIntegritySignature } from '@cetus/web/shared/wompi'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

/**
 * Helper function to wait for async payment URL
 * Used by both PSE and Bancolombia transfer payment methods
 */
async function waitForPaymentUrl(transactionId: string) {
  const maxAttempts = 5
  const delay = 1000

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const transaction = await wompi.transactions.getById(transactionId)

    const paymentMethod = transaction.data.payment_method as
      | { type: 'BANCOLOMBIA_TRANSFER'; extra?: { async_payment_url?: string } }
      | { type: 'PSE'; extra?: { async_payment_url?: string } }

    if (paymentMethod.extra?.async_payment_url) {
      return paymentMethod.extra.async_payment_url
    }

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  throw new Error('Transaction has no async payment URL')
}

type PaymentValues = typeof paymentSchema.infer

export const usePaymentSignature = (order: Order, integritySecret: string) => {
  const amount = valueToCents(order.total)
  const reference = order.id

  return useGenerateIntegritySignature(reference, amount, integritySecret)
}

export const useCreateTransaction = (order: Order, integritySecret: string) => {
  const { signature } = usePaymentSignature(order, integritySecret)
  const redirect = `${window.location.origin}/orders/${order.id}/confirmation`

  const createPaymentTransaction = async (values: PaymentValues) => {
    const baseTransactionRequest = {
      acceptance_token: values.acceptance_token,
      amount_in_cents: valueToCents(order.total),
      currency: 'COP',
      signature: signature ?? '',
      customer_email: order.customer.email,
      redirect_url: redirect,
      reference: order.id,
      customer_data: {
        phone_number: order.customer.phone,
        full_name: order.customer.name,
      },
    } satisfies Omit<CreateTransactionRequest, 'payment_method'>

    if (values.type === 'CARD') {
      const [expMonth, expYear] = values.card_expiration_date.split('/')

      const cardToken = await wompi.transactions.getCardToken({
        number: values.card_number.replace(/\s/g, ''),
        card_holder: values.card_holder,
        cvc: values.card_cvc,
        exp_year: expYear.trim(),
        exp_month: expMonth.trim(),
      })

      if (cardToken.status !== 'CREATED') {
        throw new Error('Card token creation failed')
      }

      const createTransactionRequest = {
        ...baseTransactionRequest,
        payment_method: {
          type: 'CARD',
          token: cardToken.data.id,
          installments: 1,
        },
      } satisfies CreateTransactionRequest

      return await wompi.transactions.create(createTransactionRequest)
    }

    if (values.type === 'BANCOLOMBIA_TRANSFER') {
      const createTransactionRequest = {
        ...baseTransactionRequest,
        payment_method: {
          type: 'BANCOLOMBIA_TRANSFER',
          user_type: 'PERSON',
          payment_description: `Pago de ${order.total}`,
          ecommerce_url: redirect,
        },
      } satisfies CreateTransactionRequest

      const transaction = await wompi.transactions.create(
        createTransactionRequest,
      )

      return await waitForPaymentUrl(transaction.data.id)
    }

    if (values.type === 'PSE') {
      const createTransactionRequest = {
        ...baseTransactionRequest,
        payment_method: {
          type: 'PSE',
          user_legal_id: values.user_legal_id,
          user_legal_id_type: values.user_legal_id_type,
          user_type: values.user_type,
          financial_institution_code: values.financial_institution_code,
          payment_description: `Pago de ${order.total}`,
        },
      } satisfies CreateTransactionRequest

      const transaction = await wompi.transactions.create(
        createTransactionRequest,
      )

      return await waitForPaymentUrl(transaction.data.id)
    }

    if (values.type === 'NEQUI') {
      const createTransactionRequest = {
        ...baseTransactionRequest,
        payment_method: {
          type: 'NEQUI',
          phone_number: values.phone_number,
        },
      } satisfies CreateTransactionRequest

      return await wompi.transactions.create(createTransactionRequest)
    }

    throw new Error('Invalid payment method')
  }

  const navigate = useNavigate()

  const createTransactionMutation = useMutation({
    mutationKey: ['create-transaction', order.id],
    mutationFn: createPaymentTransaction,
    onSuccess: (data) => {
      if (typeof data === 'string' && window !== undefined) {
        window.open(data, '_self')
      } else {
        navigate({
          to: '/orders/$orderId/confirmation',
          params: {
            orderId: order.id,
          },
        })
      }
    },
  })

  return createTransactionMutation
}
