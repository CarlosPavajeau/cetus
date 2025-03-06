import { type TypeOf, z } from 'zod'

export const createOrderSchema = z.object({
  address: z.string(),
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
    id: z.string(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
  }),
})

export type CreateOrderFormValues = TypeOf<typeof createOrderSchema>
