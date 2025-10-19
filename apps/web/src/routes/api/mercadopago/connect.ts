import { env } from '@cetus/env/server'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { OAuth } from 'mercadopago'
import { configureMercadoPago } from '@/api/stores'
import { getSession } from '@/functions/get-session'
import { mercadopago } from '@/functions/mercadopago'
import { setActiveOrg } from '@/functions/organizations'
import { authClient } from '@/shared/auth-client'

const HTTP_STATUS_NO_CONTENT = 204

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

        const response = await configureMercadoPago(org.data.slug || '', {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token,
          expiresIn: credentials.expires_in,
        })

        if (response.status === HTTP_STATUS_NO_CONTENT) {
          throw redirect({
            to: '/app',
          })
        }

        return new Response(null, {
          status: 500,
          statusText: 'Cannot connect to Mercado Pago',
        })
      },
    },
  },
})
