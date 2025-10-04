import { auth } from '@/server/auth'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const SetActiveOrg = createServerFn({ method: 'POST' }).handler(
  async () => {
    const headers = new Headers(getRequestHeaders() as HeadersInit)

    const list = await auth.api.listOrganizations({
      headers,
    })

    if (list.length === 0) {
      return
    }

    const org = list.at(0)

    if (!org) {
      return
    }

    await auth.api.setActiveOrganization({
      body: {
        organizationId: org.id,
      },
      headers,
    })

    return {
      id: org.id,
      slug: org.slug,
    }
  },
)
