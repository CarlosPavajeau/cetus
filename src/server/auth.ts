import { ac, roles } from '@/auth/permissions'
import { env } from '@/shared/env'
import { betterAuth } from 'better-auth'
import { admin, jwt, organization } from 'better-auth/plugins'
import { reactStartCookies } from 'better-auth/react-start'
import { Pool } from 'pg'

export const auth = betterAuth({
  user: {
    modelName: 'users',
    fields: {
      emailVerified: 'email_verified',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  account: {
    modelName: 'accounts',
    fields: {
      accountId: 'account_id',
      providerId: 'provider_id',
      userId: 'user_id',
      accessToken: 'access_token',
      refreshToken: 'refresh_token',
      idToken: 'id_token',
      accessTokenExpiresAt: 'access_token_expires_at',
      refreshTokenExpiresAt: 'refresh_token_expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  session: {
    modelName: 'sessions',
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      ipAddress: 'ip_address',
      userAgent: 'user_agent',
      userId: 'user_id',
    },
    cookieCache: {
      enabled: true,
      maxAge: 10 * 60 * 60, // 10 hours
    },
  },
  verification: {
    modelName: 'verifications',
    fields: {
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  database: new Pool({
    connectionString: env.DATABASE_URL!,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.AUTH_GOOGLE_ID!,
      clientSecret: env.AUTH_GOOGLE_SECRET!,
    },
  },
  plugins: [
    admin({
      schema: {
        user: {
          fields: {
            banExpires: 'ban_expires',
            banReason: 'ban_reason',
            impersonatedBy: 'impersonated_by',
          },
        },
        session: {
          fields: {
            impersonatedBy: 'impersonated_by',
          },
        },
      },
    }),
    organization({
      ac,
      roles: roles,
      schema: {
        session: {
          fields: {
            activeOrganizationId: 'active_organization_id',
          },
        },
        organization: {
          modelName: 'organizations',
          fields: {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            ownerId: 'owner_id',
            logoUrl: 'logo_url',
            primaryColor: 'primary_color',
            backgroundColor: 'background_color',
            textColor: 'text_color',
            metaData: 'meta_data',
          },
        },
        member: {
          modelName: 'members',
          fields: {
            organizationId: 'organization_id',
            userId: 'user_id',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
          },
        },
        invitation: {
          modelName: 'invitations',
          fields: {
            organizationId: 'organization_id',
            invitedBy: 'invited_by',
            expiresAt: 'expires_at',
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            inviterId: 'inviter_id',
          },
        },
      },
    }),
    jwt({
      schema: {
        jwks: {
          fields: {
            publicKey: 'public_key',
            privateKey: 'private_key',
            createdAt: 'created_at',
          },
        },
      },
    }),
    reactStartCookies(),
  ],
})
