import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type { PaginatedResponse } from '../types/common'
import type {
  AddVariantImages,
  AddVariantImagesResponse,
  CreateProduct,
  CreateProductOption,
  CreateProductOptionType,
  CreateProductVariant,
  CreateSimpleProduct,
  OrderVariantImages,
  Product,
  ProductForSale,
  ProductOptionResponse,
  ProductOptionType,
  ProductVariantResponse,
  SearchProductResponse,
  SimpleProductForSale,
  TopSellingProduct,
  UpdateProduct,
  UpdateProductVariant,
} from '../types/products'

export type ProductForSaleParams = {
  page?: number
  pageSize?: number
  searchTerm?: string
  categoryIds?: string[]
}

const definitions = {
  list: {
    method: 'GET',
    path: 'products',
  } as EndpointDefinition<Product[]>,

  listForSale: {
    method: 'GET',
    path: 'products/for-sale',
  } as EndpointDefinition<
    PaginatedResponse<SimpleProductForSale>,
    void,
    ProductForSaleParams
  >,

  listFeatured: {
    method: 'GET',
    path: 'products/featured',
  } as EndpointDefinition<SimpleProductForSale[]>,

  listPopular: {
    method: 'GET',
    path: 'products/popular',
  } as EndpointDefinition<SimpleProductForSale[]>,

  listByCategory: {
    method: 'GET',
    path: (categoryId: string) => `products/category/${categoryId}`,
  } as EndpointDefinition<SimpleProductForSale[], void, string>,

  listSuggestions: {
    method: 'GET',
    path: 'products/suggestions',
  } as EndpointDefinition<SimpleProductForSale[], void>,

  listTopSelling: {
    method: 'GET',
    path: 'products/top-selling',
  } as EndpointDefinition<TopSellingProduct[]>,

  search: {
    method: 'GET',
    path: 'products/search',
  } as EndpointDefinition<SearchProductResponse[]>,

  getById: {
    method: 'GET',
    path: (id: string) => `products/${id}`,
  } as EndpointDefinition<Product, void, string>,

  getBySlug: {
    method: 'GET',
    path: (slug: string) => `products/slug/${slug}`,
  } as EndpointDefinition<ProductForSale, void, string>,

  create: {
    method: 'POST',
    path: 'products',
  } as EndpointDefinition<Product, CreateProduct>,

  createSimple: {
    method: 'POST',
    path: 'products/simple',
  } as EndpointDefinition<Product, CreateSimpleProduct>,

  update: {
    method: 'PUT',
    path: (id: string) => `products/${id}`,
  } as EndpointDefinition<Product, UpdateProduct, string>,

  delete: {
    method: 'DELETE',
    path: (id: string) => `products/${id}`,
  } as EndpointDefinition<void, void, string>,
}

export const productsApi = defineResource(definitions)
