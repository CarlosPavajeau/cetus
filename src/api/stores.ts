import { api } from '@/api/client'

export type Store = {
  id: string
  name: string
  slug: string
  customDomain?: string
  logoUrl?: string
  address?: string
  phone?: string
  email?: string
  isConnectedToMercadoPago: boolean
}

export async function fetchStoreByDomain(domain: string) {
  const response = await api.get<Store>(`/stores/by-domain/${domain}`)

  return response.data
}

export async function fetchStoreBySlug(slug: string) {
  const response = await api.get<Store>(`/stores/by-slug/${slug}`)

  return response.data
}

type ConfigureMercadoPagoRequest = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function configureMercadoPago(
  storeSlug: string,
  config: ConfigureMercadoPagoRequest,
) {
  const response = await api.put(
    `/stores/payment-providers/mercado-pago/credentials?store=${storeSlug}`,
    config,
  )

  return response
}

export async function fetchMercadoPagoAuthorizationUrl(): Promise<string> {
  const response = await api.get<string>(
    `/stores/payment-providers/mercado-pago/authorization-url`,
  )

  return response.data
}

export type CreateStoreRequest = {
  name: string
  slug: string
  externalId: string
}

export async function createStore(data: CreateStoreRequest) {
  const response = await api.post('/stores', data)

  return response.data
}
