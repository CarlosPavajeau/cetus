import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type { CreateDeliveryFeeRequest, DeliveryFee } from '../types/orders'

const definitions = {
  list: {
    method: 'GET',
    path: '/orders/delivery-fees',
  } as EndpointDefinition<DeliveryFee[]>,

  getByCity: {
    method: 'GET',
    path: (cityId: string) => `/orders/delivery-fees/${cityId}`,
  } as EndpointDefinition<DeliveryFee, void, string>,

  create: {
    method: 'POST',
    path: '/orders/delivery-fees',
  } as EndpointDefinition<DeliveryFee, CreateDeliveryFeeRequest>,
}

export const deliveryFeesApi = defineResource(definitions)
