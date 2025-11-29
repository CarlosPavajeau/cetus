import {
  setStoreProvider,
  setTokenProvider,
} from '@cetus/api-client/core/instance'
import { getToken } from '@cetus/web/functions/get-token'
import { getStoreSlug } from '@cetus/web/functions/store-slug'
import consola from 'consola'

export function setupApiClient(storeSlug?: string) {
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

      return store || storeSlug || null
    } catch (error) {
      consola.error('Error getting current store:', error)
      return null
    }
  })
}
