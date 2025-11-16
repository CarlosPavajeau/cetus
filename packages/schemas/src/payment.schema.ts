import { type } from 'arktype'

export const cardPaymentSchema = type({
  type: "'CARD'",
  card_number: type.string.moreThanLength(1).configure({
    message: 'Debes ingresar el número de la tarjeta',
  }),
  card_holder: type.string.moreThanLength(1).configure({
    message: 'Debes ingresar el nombre del titular de la tarjeta',
  }),
  card_cvc: type.string.moreThanLength(1).configure({
    message: 'Debes ingresar el código de seguridad de la tarjeta',
  }),
  card_expiration_date: type.string.moreThanLength(1).configure({
    message: 'Debes ingresar la fecha de expiración de la tarjeta',
  }),
  presigned_acceptance: type.boolean.configure({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: type.boolean.configure({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: type.string.moreThanLength(1).configure({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const bancolombiaPaymentSchema = type({
  type: "'BANCOLOMBIA_TRANSFER'",
  presigned_acceptance: type.boolean.configure({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: type.boolean.configure({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: type.string.moreThanLength(1).configure({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const psePaymentSchema = type({
  type: "'PSE'",
  user_type: type("'0'|'1'").configure({
    message: 'Debes seleccionar el tipo de usuario',
  }),
  user_legal_id_type: type("'CC'|'NIT'").configure({
    message: 'Debes seleccionar el tipo de documento',
  }),
  user_legal_id: type('string>=1').configure({
    message: 'Debes ingresar el número de documento',
  }),
  financial_institution_code: type('string>=1').configure({
    message: 'Debes seleccionar la entidad financiera',
  }),
  presigned_acceptance: type.boolean.configure({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: type.boolean.configure({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: type.string.moreThanLength(1).configure({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const nequiPaymentSchema = type({
  type: "'NEQUI'",
  phone_number: type.string.moreThanLength(1).configure({
    message: 'Debes ingresar el número de teléfono',
  }),
  presigned_acceptance: type.boolean.configure({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: type.boolean.configure({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: type.string.moreThanLength(1).configure({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const paymentSchema = nequiPaymentSchema
  .or(bancolombiaPaymentSchema)
  .or(psePaymentSchema)
  .or(cardPaymentSchema)
