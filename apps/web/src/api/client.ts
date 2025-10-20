import axios from 'axios'
import { getToken } from '@/functions/get-token'
import { API_ENDPOINT } from '@/shared/constants'
import { useTenantStore } from '@/store/use-tenant-store'

const api = axios.create({
  baseURL: API_ENDPOINT,
})

api.interceptors.request.use(async (config) => {
  const token = await getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.request.use((config) => {
  const { store } = useTenantStore.getState()

  if (store) {
    config.params = {
      ...config.params,
      store: store.slug,
    }
  }

  return config
})

const anonymousApi = axios.create({
  baseURL: API_ENDPOINT,
})

anonymousApi.interceptors.request.use((config) => {
  const { store } = useTenantStore.getState()

  if (store) {
    config.params = {
      ...config.params,
      store: store.slug,
    }
  }

  return config
})

export { anonymousApi, api }
