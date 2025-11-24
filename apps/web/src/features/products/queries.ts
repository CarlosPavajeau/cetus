import { api } from '@cetus/api-client'
import { createQueryKeys } from '@cetus/web/lib/query/create-query-keys'
import { queryOptions } from '@tanstack/react-query'

export const productKeys = createQueryKeys('products')

export const productQueries = {
  list: queryOptions({
    queryKey: productKeys.lists(),
    queryFn: api.products.list,
  }),
  forSale: queryOptions({
    queryKey: [...productKeys.lists(), 'for-sale'],
    queryFn: api.products.listForSale,
  }),
  topSelling: queryOptions({
    queryKey: [...productKeys.lists(), 'top-selling'],
    queryFn: api.products.listTopSelling,
  }),
  detail: (id: string) =>
    queryOptions({
      queryKey: productKeys.detail(id),
      queryFn: () => api.products.getById(id),
    }),
  bySlug: (slug: string) =>
    queryOptions({
      queryKey: [...productKeys.details(), 'slug', slug],
      queryFn: () => api.products.getBySlug(slug),
    }),

  optionTypes: {
    list: () =>
      queryOptions({
        queryKey: [...productKeys.details(), 'option-types'],
        queryFn: api.products.optionTypes.list,
      }),
  },

  options: {
    list: (productId: string) =>
      queryOptions({
        queryKey: [...productKeys.details(), 'options', productId],
        queryFn: () => api.products.options.list(productId),
      }),
  },

  variants: {
    list: (productId: string) =>
      queryOptions({
        queryKey: [...productKeys.details(), 'variants', productId],
        queryFn: () => api.products.variants.list(productId),
      }),

    detail: (id: number) =>
      queryOptions({
        queryKey: [...productKeys.details(), 'variant', id],
        queryFn: () => api.products.variants.getById(id),
      }),
  },
}
