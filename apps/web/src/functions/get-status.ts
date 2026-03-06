import { createServerFn } from '@tanstack/react-start'

export type Status =
  | 'operational'
  | 'degraded_performance'
  | 'partial_outage'
  | 'major_outage'
  | 'under_maintenance'
  | 'unknown'
  | 'incident'
export type StatusResponse = {
  status: Status
}

export const getApiStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const response = await fetch(
      'https://api.openstatus.dev/public/status/cetus',
    )

    const status = (await response.json()) as StatusResponse

    return status
  },
)
