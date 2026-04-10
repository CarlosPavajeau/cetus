import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  CreateProductOption,
  ProductOptionResponse,
} from '../types/products'

const definitions = {
  list: {
    method: 'GET',
    path: (productId: string) => `products/${productId}/options`,
  } as EndpointDefinition<ProductOptionResponse[], void, string>,
  create: {
    method: 'POST',
    path: (productId: string) => `products/${productId}/options`,
  } as EndpointDefinition<void, CreateProductOption, string>,
}

export const productOptionsApi = defineResource(definitions)
