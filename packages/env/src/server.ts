import 'dotenv/config'

import { createEnv } from '@t3-oss/env-core'
import { type } from 'arktype'

export const env = createEnv({
  server: {
    DATABASE_URL: type('string'),
    BETTER_AUTH_SECRET: type('string'),
    AUTH_GOOGLE_ID: type('string'),
    AUTH_GOOGLE_SECRET: type('string'),
    MP_ACCESS_TOKEN: type('string'),
    MP_CLIENT_SECRET: type('string'),
    APP_URL: type('string'),
    RESEND_API_KEY: type('string'),
    RESEND_FROM: type('string'),
    CORS_ORIGIN: type('string'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,

  onValidationError: (issues) => {
    console.error('❌ Invalid environment variables:', issues)
    throw new Error(`Invalid environment variables ${JSON.stringify(issues)}`)
  },
})
