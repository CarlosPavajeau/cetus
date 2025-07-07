import { createServerFn } from '@tanstack/react-start'
import { getHeader } from '@tanstack/react-start/server'

export const getServerhost = createServerFn({ method: 'GET' }).handler(
  async () => {
    const host = getHeader('Host')!

    return {
      host,
    }
  },
)
