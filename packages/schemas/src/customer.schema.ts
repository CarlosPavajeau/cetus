import { type } from 'arktype'

export const updateCustomerSchema = type({
  id: type('string.uuid').configure({
    message: 'Por favor ingresa el ID del cliente',
  }),
  documentType: type("'CC'|'CE'|'NIT'|'PP'|'OTHER'").optional(),
  documentNumber: type.string.moreThanLength(1).optional(),
  name: type('string>1').configure({
    message: 'Por favor ingresa el nombre completo',
  }),
  email: type('string.email')
    .configure({
      message: 'Ingresa un correo electrónico válido (ejemplo@dominio.com)',
    })
    .optional(),
  phone: type.string.moreThanLength(1).configure({
    message: 'Proporciona un número de teléfono de contacto',
  }),
  address: type.string
    .moreThanLength(1)
    .configure({
      message: 'Ingrese una dirección completa',
    })
    .optional(),
})
