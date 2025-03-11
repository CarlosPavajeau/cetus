import { type TypeOf, z } from 'zod'

export const cardPaymentSchema = z.object({
  type: z.literal('CARD'),
  card_number: z.string({
    message: 'Debes ingresar el número de la tarjeta',
  }),
  card_holder: z.string({
    message: 'Debes ingresar el nombre del titular de la tarjeta',
  }),
  card_cvc: z.string({
    message: 'Debes ingresar el código de seguridad de la tarjeta',
  }),
  card_expiration_date: z.string({
    message: 'Debes ingresar la fecha de expiración de la tarjeta',
  }),

  presigned_acceptance: z.boolean({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: z.boolean({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: z.string({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const bancolombiaPaymentSchema = z.object({
  type: z.literal('BANCOLOMBIA_TRANSFER'),

  presigned_acceptance: z.boolean({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: z.boolean({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: z.string({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const psePaymentSchema = z.object({
  type: z.literal('PSE'),
  user_type: z.enum(['0', '1'], {
    message: 'Debes seleccionar el tipo de usuario',
  }),
  user_legal_id_type: z.enum(['CC', 'NIT'], {
    message: 'Debes seleccionar el tipo de documento',
  }),
  user_legal_id: z.string({
    message: 'Debes ingresar el número de documento',
  }),
  financial_institution_code: z.string({
    message: 'Debes seleccionar la entidad financiera',
  }),

  presigned_acceptance: z.boolean({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: z.boolean({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: z.string({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const nequiPaymentSchema = z.object({
  type: z.literal('NEQUI'),
  phone_number: z.string({
    message: 'Debes ingresar el número de teléfono',
  }),

  presigned_acceptance: z.boolean({
    message: 'Debes aceptar los reglamentos',
  }),
  presigned_personal_data_auth: z.boolean({
    message:
      'Debes aceptar la autorización para la administración de datos personales',
  }),
  acceptance_token: z.string({
    message: 'Debes aceptar los reglamentos',
  }),
})

export const paymentSchema = z.discriminatedUnion('type', [
  cardPaymentSchema,
  bancolombiaPaymentSchema,
  psePaymentSchema,
  nequiPaymentSchema,
])

export type PaymentFormValues = TypeOf<typeof paymentSchema>
