import type { SimpleOrder } from '@cetus/api-client/types/orders'
import { env } from '@cetus/env/client'
import {
  useClientMethod,
  useHub,
  useHubGroup,
} from '@cetus/web/hooks/realtime/use-hub'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

const HUB_URL = `${env.VITE_API_URL}/realtime/orders`

export function useOrderRealtime() {
  const { store } = useTenantStore()
  const queryClient = useQueryClient()
  const { connection } = useHub(HUB_URL)

  useHubGroup(connection, 'JoinStoreGroup', store?.slug)

  useClientMethod(
    connection,
    'ReceiveCreatedOrder',
    useCallback(
      (order: SimpleOrder) => {
        queryClient.setQueryData<SimpleOrder[]>(['orders'], (oldOrders) => {
          if (!oldOrders) {
            return [order]
          }
          return [order, ...oldOrders]
        })
      },
      [queryClient],
    ),
  )
}
