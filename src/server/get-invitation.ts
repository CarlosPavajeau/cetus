import { createServerFn } from '@tanstack/react-start'
import { getHeaders } from '@tanstack/react-start/server'
import { type } from 'arktype'
import { auth } from './auth'

const GetInvitationSchema = type({
  id: type.string,
})

export const GetInvitation = createServerFn({ method: 'GET' })
  .validator(GetInvitationSchema)
  .handler(async ({ data }) => {
    const id = data.id

    const invitation = await auth.api.getInvitation({
      query: {
        id,
      },
      headers: new Headers(getHeaders() as HeadersInit),
    })

    return invitation
  })
