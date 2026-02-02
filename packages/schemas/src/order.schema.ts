import { type } from 'arktype'

const createOrderItemSchema = type({
  variantId: type.number
    .moreThan(0)
    .describe(
      'Se requiere un identificador válido de la variante del producto',
    ),
  quantity: type.number
    .moreThan(0)
    .describe('La cantidad debe ser al menos 1 unidad'),
})

const createOrderCustomerSchema = type({
  phone: type.string.moreThanLength(1).configure({
    message: 'Proporciona un número de teléfono de contacto',
  }),
  name: type.string.moreThanLength(1).configure({
    message: 'Por favor ingresa el nombre completo',
  }),
  email: type('string.email')
    .configure({
      message: 'Ingresa un correo electrónico válido (ejemplo@dominio.com)',
    })
    .optional(),
  documentType: type("'CC'|'CE'|'NIT'|'PP'|'OTHER'").optional(),
  documentNumber: type.string.moreThanLength(1).optional(),
})

const createOrderShippingSchema = type({
  address: type.string.moreThanLength(1).configure({
    message: 'Ingrese una dirección completa',
  }),
  cityId: type.string.moreThanLength(1).configure({
    message: 'Selecciona una ciudad para la entrega',
  }),
})

export const createOrderSchema = type({
  items: createOrderItemSchema
    .array()
    .moreThanLength(0)
    .configure({ message: 'Agrega al menos un producto' }),
  customer: createOrderCustomerSchema,
  shipping: createOrderShippingSchema,
})

export const createDeliveryFeeSchema = type({
  cityId: type.string.moreThanLength(1).configure({
    message: 'Seleccione una ciudad',
  }),
  fee: type('string.integer.parse').or('number>0').to('number>0').configure({
    message: 'El costo de envío debe ser mayor a 0',
  }),
})
