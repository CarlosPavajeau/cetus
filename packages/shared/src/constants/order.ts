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
  processing: 'oklch(0.70 0.17 250)',
  ready_for_pickup: 'oklch(0.75 0.15 200)',
  shipped: 'oklch(0.68 0.16 280)',
  delivered: 'oklch(0.72 0.19 165)',
  canceled: 'oklch(0.64 0.21 25)',
  failed_delivery: 'oklch(0.65 0.20 10)',
  returned: 'oklch(0.65 0.12 320)',
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

export const saleChannels = [
  {
    value: 'whatsapp',
    label: 'WhatsApp',
  },
  {
    value: 'messenger',
    label: 'Messenger',
  },
  {
    value: 'in_store',
    label: 'Tienda',
  },
  {
    value: 'other',
    label: 'Otro',
  },
] as const

export const paymentMethodLabels = [
  {
    value: 'cash',
    label: 'Efectivo',
  },
  {
    value: 'credit_card',
    label: 'Tarjeta de crédito/debito',
  },
  {
    value: 'pse',
    label: 'PSE',
  },
  {
    value: 'cash_reference',
    label: 'Pago contra referencia',
  },
  {
    value: 'cash_on_delivery',
    label: 'Pago contra entrega',
  },
  {
    value: 'bank_transfer',
    label: 'Transferencia bancaria',
  },
  {
    value: 'nequi',
    label: 'Nequi',
  },
] as const

export const salePaymentMethods = [
  {
    value: 'cash_on_delivery',
    label: 'Pago contra entrega',
  },
  {
    value: 'bank_transfer',
    label: 'Transferencia bancaria',
  },
  {
    value: 'nequi',
    label: 'Nequi',
  },
] as const

export const paymentStatus = [
  {
    value: 'pending',
    label: 'Pendiente',
  },
  {
    value: 'awaiting_verification',
    label: 'Esperando verificación',
  },
  {
    value: 'verified',
    label: 'Verificado',
  },
  {
    value: 'rejected',
    label: 'Rechazado',
  },
  {
    value: 'refunded',
    label: 'Reembolsado',
  },
] as const

export const defaultCityId = 'f97957e9-d820-4858-ac26-b5d03d658370'
