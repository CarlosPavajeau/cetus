import { type TypeOf, z } from 'zod'

export const cardPaymentSchema = z.object({
  type: z.literal('CARD'),
  card_number: z.string(),
  card_holder: z.string(),
  card_cvc: z.string(),
  card_expiration_date: z.string(),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

export const bancolombiaPaymentSchema = z.object({
  type: z.literal('BANCOLOMBIA_TRANSFER'),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

export const psePaymentSchema = z.object({
  type: z.literal('PSE'),
  user_type: z.enum(['0', '1']),
  user_legal_id_type: z.enum(['CC', 'NIT']),
  user_legal_id: z.string(),
  financial_institution_code: z.string(),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

export const nequiPaymentSchema = z.object({
  type: z.literal('NEQUI'),
  phone_number: z.string(),

  presigned_acceptance: z.boolean(),
  presigned_personal_data_auth: z.boolean(),
  acceptance_token: z.string(),
})

export const paymentSchema = z.discriminatedUnion('type', [
  cardPaymentSchema,
  bancolombiaPaymentSchema,
  psePaymentSchema,
  nequiPaymentSchema,
])

export type PaymentFormValues = TypeOf<typeof paymentSchema>
