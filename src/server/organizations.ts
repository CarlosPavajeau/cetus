import { createServerFn } from '@tanstack/react-start'
import { getHeaders } from '@tanstack/react-start/server'
import { auth } from './auth'

export const SetActiveOrg = createServerFn({ method: 'POST' }).handler(
  async () => {
    const headers = new Headers(getHeaders() as HeadersInit)

    const list = await auth.api.listOrganizations({
      headers: headers,
    })

    if (list.length === 0) {
      return undefined
    }

    const org = list.at(0)!

    await auth.api.setActiveOrganization({
      body: {
        organizationId: org.id,
      },
      headers: headers,
    })

    return {
      id: org.id,
      slug: org.slug
    }
  },
)
