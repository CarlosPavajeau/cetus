import { type TypeOf, z } from 'zod'

export const baseProductSchema = {
  name: z.string().min(1, 'El nombre es requerido'),
  description: z
    .string()
    .optional()
    .transform((value) => (value?.trim() === '' ? undefined : value)),
  price: z.coerce.number().min(0, 'El precio debe ser mayor o igual a 0'),
  stock: z.coerce.number().int().min(0, 'El stock debe ser mayor o igual a 0'),
}

export const createProductSchema = z.object({
  ...baseProductSchema,
  imageUrl: z.string().min(1, 'La imagen es requerida'),
  categoryId: z.string().min(1, 'La categoría es requerida'),
})

export const updateProductSchema = z.object({
  ...baseProductSchema,
  id: z.string(),
  enabled: z.boolean().default(true),
  imageUrl: z.string().optional().default(''),
})

export type CreateProductFormValues = TypeOf<typeof createProductSchema>
export type UpdateProductFormValues = TypeOf<typeof updateProductSchema>
