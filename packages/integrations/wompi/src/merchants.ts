import { getWompiClient } from './client'
import type { Merchant } from './types'

export const merchantsApi = {
  get: async (publicKey: string) => {
    const client = getWompiClient()

    const response = await client.get<Merchant>(`/merchants/${publicKey}`)
    return response.data
  },
}
