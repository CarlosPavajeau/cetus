export const orderStatusLabels = Object.freeze({
  pending_payment: 'Pendiente',
  payment_confirmed: 'Pago confirmado',
  processing: 'En proceso',
  ready_for_pickup: 'Listo para recoger',
  shipped: 'Enviado',
  delivered: 'Entregado',
  failed_delivery: 'Entrega fallida',
  canceled: 'Cancelado',
  returned: 'Devuelto',
})

export const orderStatusColors = Object.freeze({
  pending_payment: 'oklch(0.77 0.16 70)',
  payment_confirmed: 'oklch(0.72 0.19 150)',
  processing: 'oklch(0.77 0.16 70)',
  ready_for_pickup: 'oklch(0.72 0.19 150)',
  shipped: 'oklch(0.72 0.19 150)',
  delivered: 'oklch(0.72 0.19 150)',
  canceled: 'oklch(0.64 0.21 25)',
  failed_delivery: 'oklch(0.72 0.00 0)',
  returned: 'oklch(0.72 0.00 0)',
})

export const orderStatusBadgeVariants = Object.freeze({
  pending_payment: 'warning',
  payment_confirmed: 'success',
  processing: 'info',
  ready_for_pickup: 'info',
  shipped: 'info',
  delivered: 'success',
  canceled: 'destructive',
  failed_delivery: 'destructive',
  returned: 'destructive',
})

export const orderPaymentProviders = Object.freeze({
  manual: 'Pago manual',
  wompi: 'Wompi',
  mercado_pago: 'MercadoPago',
})

export const manualPaymentMethodLabels = Object.freeze({
  cash_on_delivery: 'Pago contra entrega',
  bank_transfer: 'Transferencia bancaria',
})
