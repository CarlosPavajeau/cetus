import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { type } from 'arktype'
import { authClient } from '@/shared/auth-client'

const GetInvitationSchema = type({
  id: type.string,
})

export const getInvitation = createServerFn({ method: 'GET' })
  .inputValidator(GetInvitationSchema)
  .handler(async ({ data }) => {
    const id = data.id

    const invitation = await authClient.organization.getInvitation({
      fetchOptions: {
        headers: getRequestHeaders(),
      },
      query: {
        id,
      },
    })

    return invitation
  })
