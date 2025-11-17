import { getToken } from '@/functions/get-token'
import { getStoreSlug } from '@/functions/store-slug'
import {
  setStoreProvider,
  setTokenProvider,
} from '@cetus/api-client/core/instance'
import consola from 'consola'

export function setupApiClient() {
  setTokenProvider(async () => {
    try {
      const token = await getToken()
      return token
    } catch (error) {
      consola.error('Error getting access token:', error)
      return null
    }
  })

  setStoreProvider(async () => {
    try {
      const store = getStoreSlug()

      if (!store) {
        return null
      }

      return store
    } catch (error) {
      consola.error('Error getting current store:', error)
      return null
    }
  })
}
