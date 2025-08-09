import { type } from 'arktype'

export const CreateProductReviewSchema = type({
  reviewRequestId: type.string.moreThanLength(1).configure({
    message: 'El ID de la solicitud es requerido',
  }),
  rating: type('string.integer.parse')
    .or('number>=1&number<=5')
    .to('number>=1&number<=5')
    .configure({
      message: 'La calificación es requerida y debe estar entre 1 y 5',
    }),
  comment: type.string.atLeastLength(10).atMostLength(1000).configure({
    message: 'El comentario debe tener entre 10 y 1000 caracteres',
  }),
})

export type CreateProductReview = typeof CreateProductReviewSchema.infer
