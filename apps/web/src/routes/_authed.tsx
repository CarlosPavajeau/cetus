import { createFileRoute } from '@tanstack/react-router'
import { getSession } from '../functions/get-session'
import { redirect } from '@tanstack/react-router'
import { setActiveOrg } from '../functions/organizations'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const session = await getSession()

    if (!session) {
      throw redirect({ to: '/sign-in' })
    }

    let organizationId = session.session.activeOrganizationId
    if (!organizationId) {
      const activeOrg = await setActiveOrg()
      if (!activeOrg) {
        throw redirect({
          to: '/onboarding',
        })
      }

      organizationId = activeOrg.id
    }

    return {
      session,
      organizationId,
    }
  },
})
