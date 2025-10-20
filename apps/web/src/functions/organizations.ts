import { auth } from '@cetus/auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import consola from 'consola'

export const setActiveOrg = createServerFn({ method: 'POST' }).handler(
  async () => {
    const headers = new Headers(getRequestHeaders() as HeadersInit)

    consola.log('Setting active organization')

    const organizations = await auth.api.listOrganizations({
      headers,
    })

    consola.log('organizations', organizations)

    if (organizations.length === 0) {
      return
    }

    const organization = organizations.at(0)

    consola.log('organization', organization)

    if (!organization) {
      return
    }

    await auth.api.setActiveOrganization({
      body: {
        organizationId: organization.id,
      },
      headers,
    })

    return {
      id: organization.id,
      slug: organization.slug,
    }
  },
)
