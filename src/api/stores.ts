import { API_ENDPOINT } from '@/shared/constants'
import axios from 'axios'

export type Store = {
  id: string
  name: string
  slug: string
  customDomain?: string
  logoUrl?: string
}

export async function fetchStoreByDomain(domain: string) {
  const response = await axios.get<Store>(
    `${API_ENDPOINT}/stores/by-domain/${domain}`,
  )

  return response.data
}

export async function fetchStoreBySlug(slug: string) {
  const response = await axios.get<Store>(
    `${API_ENDPOINT}/stores/by-slug/${slug}`,
  )

  return response.data
}
