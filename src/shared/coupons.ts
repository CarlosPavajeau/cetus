type GenerateCouponCodeOptions = {
  length?: number
  prefix?: string
  suffix?: string
  characters?: string
}

// Exclude O, I, 1, 0
const DEFAULT_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCouponCode(options: GenerateCouponCodeOptions = {}) {
  const {
    length = 10,
    prefix = '',
    suffix = '',
    characters = DEFAULT_CHARACTERS,
  } = options

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
