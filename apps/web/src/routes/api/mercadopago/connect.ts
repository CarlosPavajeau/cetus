import { api } from '@cetus/api-client'
import { authClient } from '@cetus/auth/client'
import { env } from '@cetus/env/server'
import { getSession } from '@cetus/web/functions/get-session'
import { setActiveOrg } from '@cetus/web/functions/organizations'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import MercadoPagoConfig, { OAuth } from 'mercadopago'

export const Route = createFileRoute('/api/mercadopago/connect')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const searchParams = url.searchParams
        const code = searchParams.get('code')

        if (!code) {
          throw notFound()
        }

        const session = await getSession()

        if (!session) {
          throw redirect({
            to: '/sign-in',
          })
        }

        let activeOrganizationId = session.session.activeOrganizationId
        if (!activeOrganizationId) {
          const org = await setActiveOrg()
          activeOrganizationId = org?.id

          if (!activeOrganizationId) {
            throw redirect({
              to: '/onboarding',
            })
          }
        }

        const headers = getRequestHeaders()
        const org = await authClient.organization.getFullOrganization({
          query: {
            organizationId: activeOrganizationId,
          },
          fetchOptions: {
            headers,
          },
        })

        if (org.error) {
          throw redirect({
            to: '/onboarding',
            params: {
              error: org.error,
            },
          })
        }

        const mercadopago = new MercadoPagoConfig({
          accessToken: env.MP_ACCESS_TOKEN,
        })
        const oauth = new OAuth(mercadopago)
        const credentials = await oauth.create({
          body: {
            client_id: env.MP_CLIENT_ID,
            client_secret: env.MP_CLIENT_SECRET,
            code,
            redirect_uri: `${env.APP_URL}/api/mercadopago/connect`,
          },
        })

        if (
          !(
            credentials.access_token &&
            credentials.refresh_token &&
            credentials.expires_in
          )
        ) {
          throw notFound()
        }

        try {
          await api.stores.configureMercadopago({
            accessToken: credentials.access_token,
            refreshToken: credentials.refresh_token,
            expiresIn: credentials.expires_in,
          })

          throw redirect({
            to: '/app',
          })
        } catch (error) {
          return new Response(null, {
            status: 500,
            statusText: 'Cannot connect to Mercado Pago',
          })
        }
      },
    },
  },
})
