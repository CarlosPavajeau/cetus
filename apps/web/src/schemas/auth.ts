import { type } from 'arktype'

export const authSearchSchema = type({
  invitation: type.string.or(type.undefined).optional(),
})
