import { env } from '@cetus/env/client'
import { createServerFn } from '@tanstack/react-start'

export const getAppUrl = createServerFn({ method: 'GET' }).handler(() => {
  return env.VITE_APP_URL
})
