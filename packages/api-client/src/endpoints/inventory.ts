import { authenticatedClient } from '../core/instance'
import type { PaginatedResponse } from '../types/common'
import type {
  AdjustInventoryStock,
  InventoryTransaction,
  InventoryTransactionQueryParams,
} from '../types/products'

export const inventoryApi = {
  adjustStock: (data: AdjustInventoryStock) =>
    authenticatedClient.post<void>('inventory/adjustments', data),

  listTransactions: (params?: InventoryTransactionQueryParams) =>
    authenticatedClient.get<PaginatedResponse<InventoryTransaction>>(
      'inventory/transactions',
      {
        params,
        paramsSerializer: {
          indexes: null,
        },
      },
    ),
}
