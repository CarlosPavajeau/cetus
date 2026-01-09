import { env } from '@cetus/env/server'
import { createServerOnlyFn } from '@tanstack/react-start'

export const getAppUrl = createServerOnlyFn(() => {
  return env.APP_URL
})
