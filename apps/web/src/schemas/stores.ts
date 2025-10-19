import { type } from 'arktype'

export const UpdateStoreSchema = type({
  id: type('string'),
  name: type('string'),
  description: type('string').or('undefined').optional(),
  address: type('string').or('undefined').optional(),
  phone: type('string').or('undefined').optional(),
  email: type('string.email').or('undefined').optional(),
  customDomain: type('string.url').or('undefined').optional(),
})

export type UpdateStoreValues = typeof UpdateStoreSchema.infer
