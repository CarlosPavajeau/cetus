import { type } from 'arktype'

export const createCategorySchema = type({
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre debe tener más de 1 carácter',
  }),
})

export const editCategorySchema = type({
  id: 'string',
  name: type.string.moreThanLength(1).configure({
    message: 'El nombre debe tener más de 1 carácter',
  }),
})
