import { type } from 'arktype'

export const BaseProductSchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre del producto es requerido',
  }),
  description: type.string.optional(),
  price: type("string.integer.parse").or("number>0").to("number>0").configure({
    message: 'El precio del producto debe ser mayor a 0',
  }),
  stock: type("string.integer.parse").or("number>0").to("number>0").configure({
    message: 'El stock del producto debe ser mayor a 0',
  }),
})

export const CreateProductSchema = BaseProductSchema.and({
  imageUrl: type.string.moreThanLength(1).configure({
    message: 'La imagen del producto es requerida',
  }),
  categoryId: type.string.moreThanLength(1).configure({
    message: 'La categoría del producto es requerida',
  }),
})

export const UpdateProductSchema = BaseProductSchema.and({
  id: type.string.moreThanLength(1),
  enabled: type.boolean.default(true),
  imageUrl: type.string.or(type.undefined).optional(),
  categoryId: type.string.moreThanLength(1).configure({
    message: 'La categoría del producto es requerida',
  }),
})

export type CreateProduct = typeof CreateProductSchema.infer
export type UpdateProduct = typeof UpdateProductSchema.infer
