import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type { PaginatedResponse } from '../types/common'
import type {
  AdjustInventoryStock,
  InventoryTransaction,
  InventoryTransactionQueryParams,
} from '../types/products'

const definitions = {
  adjustStock: {
    method: 'POST',
    path: 'inventory/adjustments',
  } as EndpointDefinition<void, AdjustInventoryStock>,
  listTransactions: {
    method: 'GET',
    path: 'inventory/transactions',
  } as EndpointDefinition<PaginatedResponse<InventoryTransaction>>,
}

export const inventoryApi = defineResource(definitions)
