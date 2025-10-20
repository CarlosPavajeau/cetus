import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import consola from 'consola'
import { authClient } from '@/shared/auth-client'

export const setActiveOrg = createServerFn({ method: 'POST' }).handler(
  async () => {
    const headers = new Headers(getRequestHeaders() as HeadersInit)

    consola.log('Setting active organization')

    const organizations = await authClient.organization.list({
      fetchOptions: {
        headers,
      },
    })

    consola.log('organizations', organizations)

    if (organizations.error) {
      return
    }

    if (organizations.data.length === 0) {
      return
    }

    const organization = organizations.data.at(0)

    consola.log('organization', organization)

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
