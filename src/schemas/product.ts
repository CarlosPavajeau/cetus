import { type } from 'arktype'

export const BaseProductSchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre del producto es requerido',
  }),
  description: type.string.or(type.undefined).optional(),
  price: type('string.integer.parse').or('number>0').to('number>0').configure({
    message: 'El precio del producto debe ser mayor a 0',
  }),
  stock: type('string.integer.parse').or('number>0').to('number>0').configure({
    message: 'El stock del producto debe ser mayor a 0',
  }),
})

export const CreateProductImageSchema = type({
  id: type.string.moreThanLength(1).configure({
    message: 'El ID de la imagen del producto es requerido',
  }),
  imageUrl: type.string.moreThanLength(1).configure({
    message: 'La imagen del producto es requerida',
  }),
  sortOrder: type.number.default(0),
})

export const CreateProductSchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre del producto es requerido',
  }),
  description: type.string.or(type.undefined).optional(),
  categoryId: type.string.moreThanLength(1).configure({
    message: 'La categoría del producto es requerida',
  }),
})

export const UpdateProductSchema = type({
  id: type.string.moreThanLength(1),
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre del producto es requerido',
  }),
  description: type.string.or(type.undefined).optional(),
  categoryId: type.string.moreThanLength(1).configure({
    message: 'La categoría del producto es requerida',
  }),
  enabled: type.boolean.default(true),
})

export type CreateProduct = typeof CreateProductSchema.infer
export type UpdateProduct = typeof UpdateProductSchema.infer

export const CreateProductOptionTypeSchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre de la opción de producto es requerido',
  }),
  values: type.string.array().moreThanLength(0).configure({
    message: 'Se requiere al menos un valor para la opción de producto',
  }),
})

export type CreateProductOptionType = typeof CreateProductOptionTypeSchema.infer

export const CreateProductVariantSchema = type({
  productId: type('string.uuid').configure({
    message: 'El id del producto es requerido',
  }),
  sku: type('string').moreThanLength(1).configure({
    message: 'El SKU del producto es requerido',
  }),
  price: type('string.integer.parse').or('number>0').to('number>0').configure({
    message: 'El precio del producto debe ser mayor a 0',
  }),
  stockQuantity: type('string.integer.parse')
    .or('number>=0')
    .to('number>=0')
    .configure({
      message: 'El stock del producto debe ser mayor o igual a 0',
    }),
  optionValueIds: type('string.integer.parse')
    .or('number>0')
    .to('number>0')
    .array(),
  images: CreateProductImageSchema.array().moreThanLength(0).configure({
    message: 'Se requiere al menos una imagen del producto',
  }),
})

export type CreateProductVariant = typeof CreateProductVariantSchema.infer

export const CreateSimpleProductSchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre del producto es requerido',
  }),
  description: type.string.optional(),
  categoryId: type.string.moreThanLength(1).configure({
    message: 'La categoría del producto es requerida',
  }),
  sku: type('string').moreThanLength(1).configure({
    message: 'El SKU del producto es requerido',
  }),
  price: type('string.integer.parse').or('number>0').to('number>0').configure({
    message: 'El precio del producto debe ser mayor a 0',
  }),
  stockQuantity: type('string.integer.parse')
    .or('number>=0')
    .to('number>=0')
    .configure({
      message: 'El stock del producto debe ser mayor o igual a 0',
    }),
  images: CreateProductImageSchema.array().moreThanLength(0).configure({
    message: 'Se requiere al menos una imagen del producto',
  }),
})

export type CreateSimpleProduct = typeof CreateSimpleProductSchema.infer
