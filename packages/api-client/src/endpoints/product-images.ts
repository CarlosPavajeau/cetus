import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  AddVariantImages,
  AddVariantImagesResponse,
  OrderVariantImages,
} from '../types/products'

const definitions = {
  add: {
    method: 'POST',
    path: (variantId: number) => `products/variants/${variantId}/images`,
  } as EndpointDefinition<AddVariantImagesResponse, AddVariantImages, number>,

  order: {
    method: 'PUT',
    path: (variantId: number) => `products/variants/${variantId}/images/order`,
  } as EndpointDefinition<void, OrderVariantImages, number>,

  delete: {
    method: 'DELETE',
    path: (imageId: number) => `products/variants/images/${imageId}`,
  } as EndpointDefinition<void, void, number>,
}

export const productImagesApi = defineResource(definitions)
