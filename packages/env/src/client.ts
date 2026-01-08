import { createEnv } from '@t3-oss/env-core'
import { type } from 'arktype'

export const env = createEnv({
  clientPrefix: 'VITE_',
  client: {
    VITE_API_URL: type('string.url'),
    VITE_WOMPI_KEY: type('string'),
    VITE_WOMPI_INTEGRITY_SECRET: type('string'),
    VITE_WOMPI_API_URL: type('string.url'),
    VITE_CDN_URL: type('string.url'),
    VITE_POSTHOG_KEY: type('string'),
    VITE_POSTHOG_HOST: type('string.url'),
    VITE_MP_PUBLIC_KEY: type('string'),
    VITE_APP_URL: type('string.url'),
  },

  // biome-ignore lint/suspicious/noExplicitAny: need to access import.meta.env
  runtimeEnv: (import.meta as any).env,
  emptyStringAsUndefined: true,
  skipValidation: true,
})
