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
