import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { createIsomorphicFn, createServerFn } from '@tanstack/react-start'
import { getCookie, setCookie } from '@tanstack/react-start/server'
import { type } from 'arktype'

export const getStoreSlug = createIsomorphicFn()
  .client(() => useTenantStore.getState().store?.slug)
  .server(() => getCookie('store'))

export const setStoreSlug = createServerFn({ method: 'POST' })
  .inputValidator(type({ slug: 'string' }))
  .handler(async ({ data }) => {
    setCookie('store', data.slug, {
      secure: true,
    })
  })
