import { HttpClient } from './core/http-client'
import type { ApiClientConfig, TokenPair } from './core/types'
import { awsApi } from './endpoints/aws'
import { categoriesApi } from './endpoints/categories'
import { couponsApi } from './endpoints/coupons'
import { customersApi } from './endpoints/customers'
import { deliveryFeesApi } from './endpoints/delivery-fees'
import { inventoryApi } from './endpoints/inventory'
import { optionTypesApi } from './endpoints/option-types'
import { ordersApi } from './endpoints/orders'
import { paymentLinksApi } from './endpoints/payment-links'
import { paymentsApi } from './endpoints/payments'
import { productImagesApi } from './endpoints/product-images'
import { productOptionsApi } from './endpoints/product-options'
import { productVariantsApi } from './endpoints/product-variants'
import { productsApi } from './endpoints/products'
import { reportsApi } from './endpoints/reports'
import { reviewsApi } from './endpoints/reviews'
import { statesApi } from './endpoints/states'
import { storesApi } from './endpoints/stores'

const RESOURCES = {
  aws: awsApi,
  categories: categoriesApi,
  coupons: couponsApi,
  customers: customersApi,
  deliveryFees: deliveryFeesApi,
  inventory: inventoryApi,
  optionTypes: optionTypesApi,
  orders: ordersApi,
  paymentLinks: paymentLinksApi,
  payments: paymentsApi,
  productImages: productImagesApi,
  productOptions: productOptionsApi,
  productVariants: productVariantsApi,
  products: productsApi,
  reports: reportsApi,
  reviews: reviewsApi,
  states: statesApi,
  stores: storesApi,
}

export type Api = ReturnType<typeof createClient>

/**
 * Create a fully typed API client.
 *
 * @example
 * ```ts
 * const api = createClient({
 *   baseURL: API_URL,
 *   auth: {
 *     tokenProvider: () => getToken(),
 *   },
 * });
 *
 * const orders = await api.orders.list();
 * ```
 */
export function createClient(config: ApiClientConfig) {
  const client = new HttpClient(config)
  return client.bindResources(RESOURCES)
}

export type ClientOptions = {
  baseURL: string
  tokenProvider: () => TokenPair | null | Promise<TokenPair | null>
  storeProvider: () => string | null | Promise<string | null>
  timeout?: number
  headers?: Record<string, string>
}

/**
 * Simplified factory for token-based auth without refresh.
 */
export function createApi(options: ClientOptions) {
  const { baseURL, tokenProvider, storeProvider, timeout, headers } = options

  return createClient({
    auth: { tokenProvider },
    store: { storeProvider },
    baseURL,
    headers,
    timeout,
  })
}
