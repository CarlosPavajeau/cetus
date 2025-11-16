import { env } from '@cetus/env/client'
import { ApiClient } from './client'

let tokenProvider: (() => Promise<string | null>) | null = null
let storeProvider: (() => Promise<string | null>) | null = null

export function setTokenProvider(provider: () => Promise<string | null>) {
  tokenProvider = provider
}

export function setStoreProvider(provider: () => Promise<string | null>) {
  storeProvider = provider
}

export const anonymousClient = new ApiClient({
  baseUrl: env.VITE_API_URL,
  getCurrentStore: async () => {
    if (storeProvider) {
      return await storeProvider()
    }
    return null
  },
})

export const authenticatedClient = new ApiClient({
  baseUrl: env.VITE_API_URL,
  getAccessToken: async () => {
    if (tokenProvider) {
      return await tokenProvider()
    }
    return null
  },
  getCurrentStore: async () => {
    if (storeProvider) {
      return await storeProvider()
    }
    return null
  },
})
