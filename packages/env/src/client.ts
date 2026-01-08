import { createEnv } from '@t3-oss/env-core'
import { type } from 'arktype'

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_API_URL: type('string'),
    VITE_CDN_URL: type('string'),
    VITE_POSTHOG_KEY: type('string'),
    VITE_POSTHOG_HOST: type('string'),
    VITE_APP_URL: type('string'),
  },

  // biome-ignore lint/suspicious/noExplicitAny: need to access import.meta.env
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
})
