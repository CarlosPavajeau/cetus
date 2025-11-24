import { defaultCouponCharacters } from '../constants/coupon'
import type { GenerateCouponCodeOptions } from '../types/coupon'

export function generateCouponCode(options: GenerateCouponCodeOptions = {}) {
  const {
    length = 10,
    prefix = '',
    suffix = '',
    characters = defaultCouponCharacters,
  } = options

  if (characters.length === 0) {
    throw new Error('Character set cannot be empty')
  }

  if (length <= 0) {
    return prefix + suffix
  }

  let randomPart = ''
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength)
    randomPart += characters.charAt(randomIndex)
  }

  return `${prefix}${randomPart}${suffix}`
}
