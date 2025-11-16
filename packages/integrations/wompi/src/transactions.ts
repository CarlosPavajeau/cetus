import { getWompiClient } from './client'
import type {
  CardToken,
  CreateCardTokenRequest,
  CreateTransactionRequest,
  GetFinancialInstitutionsResponse,
  Transaction,
} from './types'

export const transactionsApi = {
  getById: async (id: string) => {
    const client = getWompiClient()

    const response = await client.get<Transaction>(`/transactions/${id}`)

    return response.data
  },

  getFinancialInstitutions: async () => {
    const client = getWompiClient()

    const response = await client.get<GetFinancialInstitutionsResponse>(
      'pse/financial_institutions',
    )

    return response.data
  },

  getCardToken: async (data: CreateCardTokenRequest) => {
    const client = getWompiClient()
    const response = await client.post<CardToken>('tokens/cards', data)

    return response.data
  },

  create: async (data: CreateTransactionRequest) => {
    const client = getWompiClient()
    const response = await client.post<Transaction>('transactions', data)

    return response.data
  },
}
