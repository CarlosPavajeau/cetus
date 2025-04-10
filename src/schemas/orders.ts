import { type TypeOf, z } from 'zod'

export const createOrderSchema = z.object({
  address: z.string().min(1, 'La dirección es obligatoria'),
  cityId: z.string(),
  total: z.coerce.number(),
  items: z.array(
    z.object({
      productName: z.string(),
      imageUrl: z.string().optional(),
      productId: z.string(),
      quantity: z.coerce.number(),
      price: z.coerce.number(),
    }),
  ),
  customer: z.object({
    id: z.string().min(1, 'El id es obligatorio'),
    name: z.string().min(1, 'El nombre es obligatorio'),
    email: z.string().min(1, 'El email es obligatorio'),
    phone: z.string().min(1, 'El teléfono es obligatorio'),
    address: z.string().min(1, 'La dirección es obligatoria'),
  }),
})

export type CreateOrderFormValues = TypeOf<typeof createOrderSchema>
