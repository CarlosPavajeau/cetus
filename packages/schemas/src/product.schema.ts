import { type } from 'arktype'

export const baseProductSchema = type({
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

export const createProductImageSchema = type({
  id: type.string.moreThanLength(1).configure({
    message: 'El ID de la imagen del producto es requerido',
  }),
  imageUrl: type.string.moreThanLength(1).configure({
    message: 'La imagen del producto es requerida',
  }),
  sortOrder: type.number.default(0),
})

export const createProductSchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre del producto es requerido',
  }),
  description: type.string.or(type.undefined).optional(),
  categoryId: type.string.moreThanLength(1).configure({
    message: 'La categoría del producto es requerida',
  }),
})

export const updateProductSchema = type({
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

export const createProductOptionTypeSchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre de la opción de producto es requerido',
  }),
  values: type.string.array().moreThanLength(0).configure({
    message: 'Se requiere al menos un valor para la opción de producto',
  }),
})

export const createProductVariantSchema = type({
  productId: type('string.uuid').configure({
    message: 'El id del producto es requerido',
  }),
  sku: type('string').moreThanLength(1).configure({
    message: 'El SKU del producto es requerido',
  }),
  price: type('string.integer.parse').or('number>0').to('number>0').configure({
    message: 'El precio del producto debe ser mayor a 0',
  }),
  stock: type('string.integer.parse')
    .or('number>=0')
    .to('number>=0')
    .configure({
      message: 'El stock del producto debe ser mayor o igual a 0',
    }),
  optionValueIds: type('string.integer.parse')
    .or('number>0')
    .to('number>0')
    .array()
    .atLeastLength(1),
  images: createProductImageSchema.array().moreThanLength(0).configure({
    message: 'Se requiere al menos una imagen del producto',
  }),
})

export const createSimpleProductSchema = type({
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
  stock: type('string.integer.parse')
    .or('number>=0')
    .to('number>=0')
    .configure({
      message: 'El stock del producto debe ser mayor o igual a 0',
    }),
  images: createProductImageSchema.array().moreThanLength(0).configure({
    message: 'Se requiere al menos una imagen del producto',
  }),
})

export const updateProductVariantSchema = type({
  id: type('number>0').configure({
    message: 'El id de la variante del producto es requerido',
  }),
  stock: type('string.integer.parse')
    .or('number>=0')
    .to('number>=0')
    .configure({
      message: 'El stock del producto debe ser mayor o igual a 0',
    }),
  price: type('string.integer.parse').or('number>0').to('number>0').configure({
    message: 'El precio del producto debe ser mayor a 0',
  }),
  enabled: type.boolean.default(true),
  featured: type.boolean.default(false),
})

export const adjustInventoryStockSchema = type({
  globalReason: type('0 < string <= 100').optional(),
  userId: type('string'),
  adjustments: type({
    variantId: type('number>0').configure({
      message: 'El id de la variante del producto es requerido',
    }),
    value: type('string.integer.parse')
      .or('number>=0')
      .to('number>=0')
      .configure({
        message: 'El valor de ajuste es requerido',
      }),
    type: type("'delta'|'snapshot'").configure({
      message: 'El tipo de ajuste es requerido',
    }),
    reason: type('0 < string <= 100').optional(),
  })
    .array()
    .moreThanLength(0)
    .configure({
      message: 'Se requiere al menos un ajuste de inventario',
    }),
})
