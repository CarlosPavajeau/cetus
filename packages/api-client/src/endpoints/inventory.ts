import { authenticatedClient } from '../core/instance'
import type { AdjustInventoryStock } from '../types/products'

export const inventoryApi = {
  adjustStock: (data: AdjustInventoryStock) =>
    authenticatedClient.post<void>('inventory/adjustments', data),
}
