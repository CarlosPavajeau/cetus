import { createEnv } from '@t3-oss/env-core'
import { type } from 'arktype'

export const env = createEnv({
  server: {
    DATABASE_URL: type('string.url'),
    BETTER_AUTH_SECRET: type('string'),
    BETTER_AUTH_URL: type('string.url'),
    AUTH_GOOGLE_ID: type('string'),
    AUTH_GOOGLE_SECRET: type('string'),
    MP_ACCESS_TOKEN: type('string'),
    MP_CLIENT_SECRET: type('string'),
    APP_URL: type('string.url'),
    RESEND_API_KEY: type('string'),
    RESEND_FROM: type('string.email'),
  },

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
    VITE_MP_CLIENT_ID: type('string'),
    VITE_APP_URL: type('string.url'),
  },

  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
