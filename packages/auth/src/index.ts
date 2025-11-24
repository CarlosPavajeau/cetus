import { db } from '@cetus/db'
import schema from '@cetus/db/schema/auth'
import { env } from '@cetus/env/server'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { type BetterAuthOptions, betterAuth } from 'better-auth/minimal'
import { admin, jwt, organization } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { ac, roles } from './permissions'

const MaxSessionCacheAge = 300

export const auth = betterAuth<BetterAuthOptions>({
  database: drizzleAdapter(db, {
    provider: 'pg',

    schema,
  }),
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: MaxSessionCacheAge,
    },
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      redirectURI: `${env.APP_URL}/api/auth/callback/google`,
    },
  },
  plugins: [
    admin(),
    organization({
      ac,
      roles,
    }),
    jwt({
      jwks: {
        keyPairConfig: {
          alg: 'RS256',
          modulusLength: 4096,
          // @ts-expect-error
          extractable: true,
        },
      },
    }),
    tanstackStartCookies(),
  ],
})
