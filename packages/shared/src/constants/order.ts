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
  pending_payment: 'bg-warning-base',
  payment_confirmed: 'bg-success-base',
  processing: 'bg-info-base',
  ready_for_pickup: 'bg-info-base',
  shipped: 'bg-info-base',
  delivered: 'bg-success-base',
  canceled: 'bg-destructive',
  failed_delivery: 'bg-destructive',
  returned: 'bg-destructive',
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
