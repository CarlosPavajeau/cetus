import { anonymousClient, authenticatedClient } from '../core/instance'
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
  SimpleProductForSale,
  TopSellingProduct,
  UpdateProduct,
  UpdateProductVariant,
} from '../types/products'

export const productsApi = {
  list: () => authenticatedClient.get<Product[]>('products'),

  listForSale: () =>
    anonymousClient.get<SimpleProductForSale[]>('products/for-sale'),

  listFeatured: () =>
    anonymousClient.get<SimpleProductForSale[]>('products/featured'),

  listPopular: () =>
    anonymousClient.get<SimpleProductForSale[]>('products/popular'),

  listByCategory: (categoryId: string) =>
    anonymousClient.get<SimpleProductForSale[]>(
      `products/category/${categoryId}`,
    ),

  listSuggestions: (productId: string) =>
    anonymousClient.get<SimpleProductForSale[]>('products/suggestions', {
      params: { productId },
    }),

  listTopSelling: () =>
    authenticatedClient.get<TopSellingProduct[]>('products/top-selling'),

  getById: (id: string) => authenticatedClient.get<Product>(`products/${id}`),

  getBySlug: (slug: string) =>
    anonymousClient.get<ProductForSale>(`products/slug/${slug}`),

  create: (data: CreateProduct) =>
    authenticatedClient.post<Product>('products', data),

  createSimple: (data: CreateSimpleProduct) =>
    authenticatedClient.post<Product>('products/simple', data),

  update: (id: string, data: UpdateProduct) =>
    authenticatedClient.put<Product>(`products/${id}`, data),

  delete: (id: string) => authenticatedClient.delete<void>(`products/${id}`),

  optionTypes: {
    list: () =>
      authenticatedClient.get<ProductOptionType[]>('products/option-types'),

    create: (data: CreateProductOptionType) =>
      authenticatedClient.post<ProductOptionType>(
        'products/option-types',
        data,
      ),
  },

  options: {
    list: (productId: string) =>
      authenticatedClient.get<ProductOptionResponse[]>(
        `products/${productId}/options`,
      ),

    create: (data: CreateProductOption) =>
      authenticatedClient.post<void>(
        `products/${data.productId}/options`,
        data,
      ),
  },

  variants: {
    list: (productId: string) =>
      authenticatedClient.get<ProductVariantResponse[]>(
        `products/${productId}/variants`,
      ),

    getById: (id: number) =>
      authenticatedClient.get<ProductVariantResponse>(
        `products/variants/${id}`,
      ),

    create: (data: CreateProductVariant) =>
      authenticatedClient.post<ProductVariantResponse>(
        `products/${data.productId}/variants`,
        data,
      ),

    update: (id: number, data: UpdateProductVariant) =>
      authenticatedClient.put<ProductVariantResponse>(
        `products/variants/${id}`,
        data,
      ),

    images: {
      add: (id: number, data: AddVariantImages) =>
        authenticatedClient.post<AddVariantImagesResponse>(
          `products/variants/${id}/images`,
          data,
        ),

      order: (data: OrderVariantImages) =>
        authenticatedClient.put<void>(
          `products/variants/${data.variantId}/images/order`,
          data,
        ),

      delete: (variantId: number, imageId: number) =>
        authenticatedClient.delete<void>(
          `products/variants/images/${imageId}`,
          {
            params: {
              variantId,
            },
          },
        ),
    },
  },
}
