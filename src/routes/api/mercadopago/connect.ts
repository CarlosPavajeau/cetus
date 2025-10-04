import { configureMercadoPago } from '@/api/stores'
import { auth } from '@/server/auth'
import { GetSession } from '@/server/get-session'
import { mercadopago } from '@/server/mercadopago'
import { SetActiveOrg } from '@/server/organizations'
import { env } from '@/shared/env'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { OAuth } from 'mercadopago'

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

        const { session } = await GetSession()

        if (!session) {
          throw redirect({
            to: '/sign-in',
          })
        }

        let activeOrganizationId = session.activeOrganizationId
        if (!activeOrganizationId) {
          const org = await SetActiveOrg()
          activeOrganizationId = org?.id

          if (!activeOrganizationId) {
            throw redirect({
              to: '/onboarding',
            })
          }
        }

        const headers = new Headers(getRequestHeaders() as HeadersInit)
        const org = await auth.api.getFullOrganization({
          query: {
            organizationId: activeOrganizationId,
          },
          headers,
        })

        if (!org) {
          throw redirect({
            to: '/onboarding',
          })
        }

        const oauth = new OAuth(mercadopago)
        const credentials = await oauth.create({
          body: {
            client_id: env.VITE_MP_CLIENT_ID,
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

        const response = await configureMercadoPago(org.slug, {
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
