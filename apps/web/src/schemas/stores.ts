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

export const ConfigureWompiCredentialsSchema = type({
  publicKey: type('string').atLeastLength(1).configure({
    message: 'La llave pública es requerida',
  }),
  privateKey: type('string').atLeastLength(1).configure({
    message: 'La llave privada es requerida',
  }),
  eventsKey: type('string').atLeastLength(1).configure({
    message: 'La llave de eventos es requerida',
  }),
  integrityKey: type('string').atLeastLength(1).configure({
    message: 'La llave de integridad es requerida',
  }),
})

export type ConfigureWompiCredentialsValues =
  typeof ConfigureWompiCredentialsSchema.infer
