export const orderStatusLabels = Object.freeze({
  pending: 'Pendiente',
  paid: 'Pagado',
  delivered: 'Enviado',
  canceled: 'Cancelado',
})

export const orderStatusColors = Object.freeze({
  pending: 'bg-warning-base',
  paid: 'bg-success-base',
  delivered: 'bg-success-base',
  canceled: 'bg-destructive',
})

export const orderPaymentProviders = Object.freeze({
  wompi: 'Wompi',
  mercado_pago: 'MercadoPago',
})
