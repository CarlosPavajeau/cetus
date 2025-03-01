import axios from 'axios'

const wompi = axios.create({
  baseURL: import.meta.env.PUBLIC_WONPI_API_URL,
  headers: {
    Authorization: `Bearer ${import.meta.env.PUBLIC_WOMPI_KEY}`,
  },
})

export type PresignedToken = {
  acceptance_token: string
  permalink: string
  type: string
}

export type Merchant = {
  data: {
    id: string
    presigned_acceptance: PresignedToken
    presigned_personal_data_auth: PresignedToken
  }
}

export const getMerchant = async () => {
  const response = await wompi.get<Merchant>(
    `/merchants/${import.meta.env.PUBLIC_WOMPI_KEY}`,
  )

  return response.data
}

export type TransactionPaymentMethod =
  | {
      type: 'CARD'
      token: string
      installments: number

      extra?: undefined
    }
  | {
      type: 'NEQUI'
      phone_number: string

      extra?: undefined
    }
  | {
      type: 'BANCOLOMBIA_TRANSFER'
      payment_description: string
      ecommerce_url: string
      user_type: 'PERSON'

      extra?: {
        async_payment_url: string
      }
    }
  | {
      type: 'PSE'
      user_type: string
      user_legal_id_type: string
      user_legal_id: string
      financial_institution_code: string
      payment_description: string

      extra?: {
        async_payment_url: string
      }
    }

export type CreateTransactionRequest = {
  acceptance_token: string
  amount_in_cents: number
  currency: 'COP'
  signature: string
  customer_email: string
  payment_method: TransactionPaymentMethod
  redirect_url: string
  reference: string

  customer_data: {
    phone_number: string
    full_name: string
    legal_id?: string
    legal_id_type?: string
  }
}

export type Transaction = {
  data: {
    id: string
    created_at: string
    amount_in_cents: number
    status: 'PENDING' | 'APPROVED' | 'DECLINED'
    reference: string
    customer_email: string
    currency: 'COP'
    payment_method_type: 'CARD' | 'NEQUI' | 'BANCOLOMBIA_TRANSFER' | 'PSE'
    payment_method: TransactionPaymentMethod
    customer_data: {
      phone_number: string
      full_name: string
      legal_id: string
      legal_id_type: string
    }
  }
}

export const createTransaction = async (data: CreateTransactionRequest) => {
  const response = await wompi.post<Transaction>('/transactions', data)

  return response.data
}

export const getTransaction = async (id: string) => {
  const response = await wompi.get<Transaction>(`/transactions/${id}`)

  return response.data
}

export const createBancolombiaTransfer = async (
  data: CreateTransactionRequest,
) => {
  if (data.payment_method.type !== 'BANCOLOMBIA_TRANSFER') {
    throw new Error('Invalid payment method')
  }

  const response = await wompi.post<Transaction>('/transactions', data)

  let transaction = response.data
  let payment = transaction.data.payment_method

  // Perform long polling to check if the transaction has async payment URL
  const maxRetries = 5
  let retries = 0

  while (payment && !payment.extra?.async_payment_url && retries < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    transaction = await getTransaction(transaction.data.id)
    payment = transaction.data.payment_method

    retries++
  }

  if (!payment?.extra?.async_payment_url) {
    throw new Error('Transaction has no async payment URL')
  }

  return payment.extra.async_payment_url
}

export type CreateCardTokenRequest = {
  number: string
  cvc: string
  exp_month: string
  exp_year: string
  card_holder: string
}

export type CardToken = {
  status: string
  data: {
    id: string
  }
}

export const createCardToken = async (data: CreateCardTokenRequest) => {
  const response = await wompi.post<CardToken>('/tokens/cards', data)

  return response.data
}
