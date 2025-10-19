import { auth } from '@cetus/auth'
import { createMiddleware } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'

export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })

  return next({
    context: { session },
  })
})
