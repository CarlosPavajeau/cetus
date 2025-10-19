import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { authClient } from '@/shared/auth-client'

export const setActiveOrg = createServerFn({ method: 'POST' }).handler(
  async () => {
    const headers = new Headers(getRequestHeaders() as HeadersInit)

    const organizations = await authClient.organization.list({
      fetchOptions: {
        headers,
      },
    })

    if (organizations.error) {
      return
    }

    if (organizations.data.length === 0) {
      return
    }

    const organization = organizations.data.at(0)

    if (!organization) {
      return
    }

    await authClient.organization.setActive({
      organizationId: organization.id,
      fetchOptions: {
        headers,
      },
    })

    return {
      id: organization.id,
      slug: organization.slug,
    }
  },
)
