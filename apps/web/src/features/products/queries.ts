import type { ProductForSaleParams } from '@cetus/api-client/endpoints/products'
import type { InventoryTransactionQueryParams } from '@cetus/api-client/types/products'
import { api } from '@cetus/web/lib/client-api'
import { createQueryKeys } from '@cetus/web/lib/query/create-query-keys'
import { queryOptions } from '@tanstack/react-query'

export const productKeys = createQueryKeys('products')

export const productQueries = {
  list: queryOptions({
    queryKey: productKeys.lists(),
    queryFn: api.products.list,
  }),
  forSale: (params: ProductForSaleParams) =>
    queryOptions({
      queryKey: [...productKeys.lists(), 'for-sale', params],
      queryFn: () => api.products.listForSale(params),
    }),
  topSelling: queryOptions({
    queryKey: [...productKeys.lists(), 'top-selling'],
    queryFn: api.products.listTopSelling,
  }),
  search: (term: string) =>
    queryOptions({
      queryKey: [...productKeys.lists(), 'search', term],
      queryFn: () =>
        api.products.search({
          params: {
            searchTerm: term,
          },
        }),
      enabled: term.trim().length > 3,
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
        queryFn: api.optionTypes.list,
      }),
  },

  options: {
    list: (productId: string) =>
      queryOptions({
        queryKey: [...productKeys.details(), 'options', productId],
        queryFn: () => api.productOptions.list(productId),
      }),
  },

  variants: {
    list: (productId: string) =>
      queryOptions({
        queryKey: [...productKeys.details(), 'variants', productId],
        queryFn: () => api.productVariants.list(productId),
      }),

    detail: (id: number) =>
      queryOptions({
        queryKey: [...productKeys.details(), 'variant', id],
        queryFn: () => api.productVariants.getById(id),
      }),
  },

  inventory: {
    transactions: (filters?: InventoryTransactionQueryParams) =>
      queryOptions({
        queryKey: [...productKeys.list(filters), 'inventory', 'transactions'],
        queryFn: () =>
          api.inventory.listTransactions({
            params: {
              ...filters,
            },
          }),
      }),
  },
}
