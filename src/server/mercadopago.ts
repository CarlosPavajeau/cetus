import { env } from '@/shared/env'
import { MercadoPagoConfig } from 'mercadopago'

export const mercadopago = new MercadoPagoConfig({
  accessToken: env.MP_ACCESS_TOKEN!,
})
