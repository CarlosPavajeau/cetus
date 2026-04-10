import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  CreateProductOptionType,
  ProductOptionType,
} from '../types/products'

const definitions = {
  list: {
    method: 'GET',
    path: 'products/option-types',
  } as EndpointDefinition<ProductOptionType[]>,

  create: {
    method: 'POST',
    path: 'products/option-types',
  } as EndpointDefinition<ProductOptionType, CreateProductOptionType>,
}

export const optionTypesApi = defineResource(definitions)
