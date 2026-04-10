import type { FetchRequestConfig, StoreConfig } from '../types'
import type { BaseFetchFn } from './auth'

export function createStoreMiddleware(
  baseFetch: BaseFetchFn,
  config: StoreConfig,
): <T>(config: FetchRequestConfig) => Promise<T> {
  const { storeProvider, headerName = 'X-Current-Store-Id' } = config

  return async <T>(requestConfig: FetchRequestConfig): Promise<T> => {
    const storeId = await storeProvider()
    const storeHeader = storeId ? { [headerName]: storeId } : {}

    return baseFetch<T>(requestConfig, storeHeader)
  }
}
