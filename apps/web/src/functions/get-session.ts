import { authMiddleware } from '@cetus/web/middleware/auth'
import { createServerFn } from '@tanstack/react-start'

export const getSession = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(({ context }) => context.session)
