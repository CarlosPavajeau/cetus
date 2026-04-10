import type { Store } from '@cetus/api-client/types/stores'
import { authClient } from '@cetus/auth/client'
import { api } from '@cetus/web/lib/client-api'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { useQuery } from '@tanstack/react-query'
import { createContext, useEffect, useMemo } from 'react'

type StoreContext = {
  store?: Store
  isLoading: boolean
}

export const storeContext = createContext<StoreContext>({
  store: undefined,
  isLoading: false,
})

type Props = {
  children: React.ReactNode
}

export function StoreProvider({ children }: Props) {
  const { data, isPending } = authClient.useActiveOrganization()
  const shouldFetch = !isPending && data?.id !== undefined

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', 'external', data?.id],
    queryFn: () => api.stores.getByExternalId(data?.id ?? ''),
    staleTime: 5 * 60 * 1000,
    enabled: shouldFetch,
  })

  const { actions } = useTenantStore()

  const contextValue = useMemo(() => ({ isLoading, store }), [store, isLoading])

  useEffect(() => {
    if (store) {
      actions.setStore(store)
    }
  }, [store, actions])

  return (
    <storeContext.Provider value={contextValue}>
      {children}
    </storeContext.Provider>
  )
}
