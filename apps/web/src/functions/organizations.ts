import { auth } from '@cetus/auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const setActiveOrg = createServerFn({ method: 'POST' }).handler(
  async () => {
    const headers = new Headers(getRequestHeaders() as HeadersInit)

    const organizations = await auth.api.listOrganizations({
      headers,
    })

    if (organizations.length === 0) {
      return
    }

    const organization = organizations.at(0)

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
