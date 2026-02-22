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

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR'

export type PaymentMethodType =
  | 'CARD'
  | 'NEQUI'
  | 'BANCOLOMBIA_TRANSFER'
  | 'PSE'

export type PSEUserType = '0' | '1' // 0 for person, 1 for company
export type BancolombiaUserType = 'PERSON'

export type LegalIdType = 'CC' | 'NIT'

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
  signature?: string
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
  customer_data: CustomerData
}

export type Transaction = {
  data: TransactionData
}

/**
 * Card tokenization request.
 * WARNING: Contains sensitive PCI data. Never log or store these values.
 * Must be transmitted over HTTPS only.
 */
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
