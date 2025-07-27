import { api } from '@/api/client'

export type Store = {
  id: string
  name: string
  slug: string
  customDomain?: string
  logoUrl?: string
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
    {
      body: config,
    },
  )

  return response
}
