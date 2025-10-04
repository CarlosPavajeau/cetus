import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { type } from 'arktype'
import { auth } from './auth'

const GetInvitationSchema = type({
  id: type.string,
})

export const GetInvitation = createServerFn({ method: 'GET' })
  .inputValidator(GetInvitationSchema)
  .handler(async ({ data }) => {
    const id = data.id

    const invitation = await auth.api.getInvitation({
      query: {
        id,
      },
      headers: new Headers(getRequestHeaders() as HeadersInit),
    })

    return invitation
  })
