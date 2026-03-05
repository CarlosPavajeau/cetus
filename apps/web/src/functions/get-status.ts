import { getStatus } from '@openstatus/react'
import { createServerFn } from '@tanstack/react-start'

export const getApiStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const status = await getStatus('cetus')

    return status
  },
)
