import { type TypeOf, z } from 'zod'

export const createProductReviewSchema = z.object({
  reviewRequestId: z.string().min(1, 'El ID de la solicitud es requerido'),
  rating: z.coerce
    .number()
    .min(1, 'La calificación es requerida')
    .max(5, 'La calificación máxima es 5'),
  comment: z
    .string()
    .min(10, 'El comentario debe tener al menos 10 caracteres')
    .max(1000, 'El comentario no puede exceder los 1000 caracteres'),
})

export type CreateProductReviewFormValues = TypeOf<
  typeof createProductReviewSchema
>
