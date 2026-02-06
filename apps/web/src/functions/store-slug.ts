import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { createIsomorphicFn, createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { type } from 'arktype'

export const getCurrentStoreId = createIsomorphicFn()
  .client(() => useTenantStore.getState().store?.id)
  .server(() => getCookie('store'))

export const setStoreId = createServerFn({ method: 'POST' })
  .inputValidator(type({ id: 'string.uuid' }))
  .handler(({ data }) => {
    setCookie('store', data.id, {
      secure: true,
    })
  })
