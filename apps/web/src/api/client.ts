import axios from 'axios'
import { authClient } from '@/shared/auth-client'
import { API_ENDPOINT } from '@/shared/constants'
import { useTenantStore } from '@/store/use-tenant-store'

const api = axios.create({
  baseURL: API_ENDPOINT,
})

api.interceptors.request.use(async (config) => {
  const response = await authClient.token()

  if (response.data) {
    config.headers.Authorization = `Bearer ${response.data.token}`
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
