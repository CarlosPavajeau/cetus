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
    MP_CLIENT_ID: type('string'),
    APP_URL: type('string.url'),
    RESEND_API_KEY: type('string'),
    RESEND_FROM: type('string.email'),
    CORS_ORIGIN: type('string.url'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
