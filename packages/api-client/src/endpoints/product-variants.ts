import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  CreateProductVariant,
  ProductVariantResponse,
} from '../types/products'

const definitions = {
  list: {
    method: 'GET',
    path: (productId: string) => `products/${productId}/variants`,
  } as EndpointDefinition<ProductVariantResponse[], void, string>,

  getById: {
    method: 'GET',
    path: (variantId: number) => `products/variants/${variantId}`,
  } as EndpointDefinition<ProductVariantResponse, void, number>,

  create: {
    method: 'POST',
    path: (productId: string) => `products/${productId}/variants`,
  } as EndpointDefinition<ProductVariantResponse, CreateProductVariant, string>,

  update: {
    method: 'PUT',
    path: (variantId: number) => `products/variants/${variantId}`,
  } as EndpointDefinition<ProductVariantResponse, CreateProductVariant, number>,
}

export const productVariantsApi = defineResource(definitions)
