import { env } from '@cetus/env/server'
import { createServerFn } from '@tanstack/react-start'
import { type } from 'arktype'
import { MercadoPagoConfig, Payment } from 'mercadopago'

export const mercadopago = new MercadoPagoConfig({
  accessToken: env.MP_ACCESS_TOKEN,
})

const GetPaymentSchema = type({
  payment_id: 'number.integer',
})

export const getMercadoPagoPayment = createServerFn({ method: 'GET' })
  .inputValidator(GetPaymentSchema)
  .handler(async ({ data }) => {
    const { payment_id } = data
    const paymentClient = new Payment(mercadopago)

    const payment = await paymentClient.get({ id: payment_id })

    return payment
  })
