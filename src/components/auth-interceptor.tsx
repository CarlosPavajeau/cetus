import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'
import { useEffect } from 'react'

export const AuthInterceptor = () => {
  const { getToken } = useAuth()

  useEffect(() => {
    axios.interceptors.request.use(async (config) => {
      const token = await getToken()

      config.headers.Authorization = `Bearer ${token}`
      return config
    })
  }, [getToken])

  return null
}
