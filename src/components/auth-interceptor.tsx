import { GetAuthToken } from '@/server/get-auth-token'
import axios from 'axios'
import { useEffect } from 'react'

export const AuthInterceptor = () => {
  useEffect(() => {
    axios.interceptors.request.use(async (config) => {
      const { token } = await GetAuthToken()

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      return config
    })
  }, [])
  return null
}
