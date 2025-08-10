import type { SimpleOrder } from '@/api/orders'
import { useClientMethod, useHub, useHubGroup } from '@/hooks/realtime/use-hub'
import { useTenantStore } from '@/store/use-tenant-store'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

const HUB_URL = `${import.meta.env.VITE_API_URL}/realtime/orders`

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
