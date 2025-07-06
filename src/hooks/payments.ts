import type { Order } from '@/api/orders'
import {
  type CreateTransactionRequest,
  createBancolombiaTransfer,
  createCardToken,
  createPSETransaction,
  createTransaction,
} from '@/api/third-party/wompi'
import type { PaymentFormValues } from '@/schemas/payments'
import { valueToCents } from '@/shared/currency'
import { useGenerateIntegritySignature } from '@/shared/wompi'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const usePaymentSignature = (order: Order) => {
  const amount = valueToCents(order.total)
  const reference = order.id
  const integritySecret = import.meta.env.VITE_WOMPI_INTEGRITY_SECRET

  return useGenerateIntegritySignature(reference, amount, integritySecret)
}

export const useCreateTransaction = (order: Order) => {
  const { signature } = usePaymentSignature(order)
  const redirect = window.location.origin + `/orders/${order.id}/confirmation`

  const createPaymentTransaction = async (values: PaymentFormValues) => {
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

      const cardToken = await createCardToken({
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

      return await createTransaction(createTransactionRequest)
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

      return await createBancolombiaTransfer(createTransactionRequest)
    }

    if (values.type === 'PSE') {
      const createTransactionRequest = {
        ...baseTransactionRequest,
        payment_method: {
          type: 'PSE',
          user_type: values.user_type,
          user_legal_id_type: values.user_legal_id_type,
          user_legal_id: values.user_legal_id,
          financial_institution_code: values.financial_institution_code,
          payment_description: `Pago de ${order.total}`,
        },
      } satisfies CreateTransactionRequest

      return await createPSETransaction(createTransactionRequest)
    }

    if (values.type === 'NEQUI') {
      const createTransactionRequest = {
        ...baseTransactionRequest,
        payment_method: {
          type: 'NEQUI',
          phone_number: values.phone_number,
        },
      } satisfies CreateTransactionRequest

      return await createTransaction(createTransactionRequest)
    }

    throw new Error('Invalid payment method')
  }

  const createTransactionMutation = useMutation({
    mutationKey: ['create-transaction', order.id],
    mutationFn: createPaymentTransaction,
  })

  const navigate = useNavigate()

  useEffect(() => {
    if (createTransactionMutation.isSuccess) {
      const data = createTransactionMutation.data

      if (typeof data === 'string') {
        window.open(data, '_self')
      } else {
        navigate({
          to: `/orders/${order.id}/confirmation`,
          search: {
            id: data.data.id,
          },
        })
      }
    }
  }, [createTransactionMutation, order, navigate])

  return createTransactionMutation
}
