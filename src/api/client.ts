import { GetAuthToken } from '@/server/get-auth-token'
import { API_ENDPOINT } from '@/shared/constants'
import { useTenantStore } from '@/store/use-tenant-store'
import axios from 'axios'

const api = axios.create({
  baseURL: API_ENDPOINT,
})

api.interceptors.request.use(async (config) => {
  const response = await GetAuthToken()

  if (response) {
    config.headers.Authorization = `Bearer ${response.token}`
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
