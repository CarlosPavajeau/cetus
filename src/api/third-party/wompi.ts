import axios from 'axios'

// Base client setup
const createWompiClient = () => {
  return axios.create({
    baseURL: import.meta.env.PUBLIC_WOMPI_API_URL,
    headers: {
      Authorization: `Bearer ${import.meta.env.PUBLIC_WOMPI_KEY}`,
    },
  })
}

const wompi = createWompiClient()

// Types
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

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED'

export type PaymentMethodType =
  | 'CARD'
  | 'NEQUI'
  | 'BANCOLOMBIA_TRANSFER'
  | 'PSE'

export type PSEUserType = '0' | '1' // 0 for person, 1 for company
export type BancolombiaUserType = 'PERSON'

export type LegalIdType = 'CC' | 'NIT'

// Payment methods with discriminated union for better type safety
export type CardPaymentMethod = {
  type: 'CARD'
  token: string
  installments: number
  extra?: never
}

export type NequiPaymentMethod = {
  type: 'NEQUI'
  phone_number: string
  extra?: never
}

export type BancolombiaTransferPaymentMethod = {
  type: 'BANCOLOMBIA_TRANSFER'
  payment_description: string
  ecommerce_url: string
  user_type: BancolombiaUserType
  extra?: {
    async_payment_url: string
  }
}

export type PSEPaymentMethod = {
  type: 'PSE'
  user_type: PSEUserType
  user_legal_id_type: LegalIdType
  user_legal_id: string
  financial_institution_code: string
  payment_description: string
  extra?: {
    async_payment_url: string
  }
}

export type TransactionPaymentMethod =
  | CardPaymentMethod
  | NequiPaymentMethod
  | BancolombiaTransferPaymentMethod
  | PSEPaymentMethod

export type CustomerData = {
  phone_number: string
  full_name: string
  legal_id?: string
  legal_id_type?: LegalIdType
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
  customer_data: CustomerData
}

export type TransactionData = {
  id: string
  created_at: string
  amount_in_cents: number
  status: TransactionStatus
  reference: string
  customer_email: string
  currency: 'COP'
  payment_method_type: PaymentMethodType
  payment_method: TransactionPaymentMethod
  customer_data: Required<CustomerData>
}

export type Transaction = {
  data: TransactionData
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

export type FinancialInstitution = {
  financial_institution_code: string
  financial_institution_name: string
}

export type GetFinancialInstitutionsResponse = {
  data: FinancialInstitution[]
}

// API Functions
export const getMerchant = async () => {
  const response = await wompi.get<Merchant>(
    `/merchants/${import.meta.env.PUBLIC_WOMPI_KEY}`,
  )
  return response.data
}

export const createTransaction = async (data: CreateTransactionRequest) => {
  const response = await wompi.post<Transaction>('/transactions', data)
  return response.data
}

export const getTransaction = async (id: string) => {
  const response = await wompi.get<Transaction>(`/transactions/${id}`)
  return response.data
}

export const createCardToken = async (data: CreateCardTokenRequest) => {
  const response = await wompi.post<CardToken>('/tokens/cards', data)
  return response.data
}

export const getFinancialInstitutions = async () => {
  const response = await wompi.get<GetFinancialInstitutionsResponse>(
    '/pse/financial_institutions',
  )
  return response.data
}

/**
 * Helper function to wait for async payment URL
 * Used by both PSE and Bancolombia transfer payment methods
 */
const waitForAsyncPaymentUrl = async (transactionId: string) => {
  let transaction = await getTransaction(transactionId)
  let payment = transaction.data.payment_method as
    | BancolombiaTransferPaymentMethod
    | PSEPaymentMethod

  // Perform long polling to check if the transaction has async payment URL
  const maxRetries = 5
  let retries = 0

  while (!payment.extra?.async_payment_url && retries < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    transaction = await getTransaction(transactionId)
    payment = transaction.data.payment_method as
      | BancolombiaTransferPaymentMethod
      | PSEPaymentMethod
    retries++
  }

  if (!payment.extra?.async_payment_url) {
    throw new Error('Transaction has no async payment URL')
  }

  return payment.extra.async_payment_url
}

/**
 * Create a transaction with Bancolombia transfer and wait for the async payment URL
 */
export const createBancolombiaTransfer = async (
  data: CreateTransactionRequest,
) => {
  if (data.payment_method.type !== 'BANCOLOMBIA_TRANSFER') {
    throw new Error('Invalid payment method')
  }

  const transaction = await createTransaction(data)
  return waitForAsyncPaymentUrl(transaction.data.id)
}

/**
 * Create a transaction with PSE and wait for the async payment URL
 */
export const createPSETransaction = async (data: CreateTransactionRequest) => {
  if (data.payment_method.type !== 'PSE') {
    throw new Error('Invalid payment method')
  }

  const transaction = await createTransaction(data)
  return waitForAsyncPaymentUrl(transaction.data.id)
}
