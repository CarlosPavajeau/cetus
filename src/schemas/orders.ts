import { type } from 'arktype'

const CreateOrderItemSchema = type({
  productName: type.string
    .moreThanLength(1)
    .describe('Ingresa el nombre del producto'),
  imageUrl: 'string?',
  variantId: type.number
    .moreThan(0)
    .describe(
      'Se requiere un identificador válido de la variante del producto',
    ),
  quantity: type.number
    .moreThan(0)
    .describe('La cantidad debe ser al menos 1 unidad'),
  price: type.number
    .moreThan(0)
    .describe('El precio debe ser un valor positivo'),
})

export const CreateOrderSchema = type({
  address: type.string.moreThanLength(1).configure({
    message: 'Ingrese una dirección completa',
  }),
  cityId: type.string.moreThanLength(1).configure({
    message: 'Selecciona una ciudad para la entrega',
  }),
  total: type.number
    .moreThan(0)
    .describe('El total del pedido debe ser mayor a cero'),
  items: CreateOrderItemSchema.array().moreThanLength(0),
  customer: {
    id: type.string.moreThanLength(1).configure({
      message: 'Por favor ingrese su número de identificación',
    }),
    name: type.string.moreThanLength(1).configure({
      message: 'Por favor ingresa el nombre completo',
    }),
    email: type('string.email').configure({
      message: 'Ingresa un correo electrónico válido (ejemplo@dominio.com)',
    }),
    phone: type.string.moreThanLength(1).configure({
      message: 'Proporciona un número de teléfono de contacto',
    }),
    address: type.string.moreThanLength(1).configure({
      message: 'Ingrese una dirección completa',
    }),
  },
})

export type CreateOrder = typeof CreateOrderSchema.infer
