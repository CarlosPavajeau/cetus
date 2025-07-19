import { GetAuthToken } from '@/server/get-auth-token'
import { API_ENDPOINT } from '@/shared/constants'
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

export { api }
