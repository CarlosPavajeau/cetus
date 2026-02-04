import type {
  PaymentMethod,
  PaymentStatus,
} from '@cetus/api-client/types/orders'

const paymentStatusLabels = new Map<PaymentStatus, string>([
  ['pending', 'Pendiente'],
  ['awaiting_verification', 'Esperando verificación'],
  ['verified', 'Verificado'],
  ['rejected', 'Rechazado'],
  ['refunded', 'Reembolsado'],
] as const)

export function getPaymentStatusLabel(status?: PaymentStatus) {
  if (!status) {
    return 'Desconocido'
  }

  return paymentStatusLabels.get(status) || status
}

const paymentMethodLabels = new Map<PaymentMethod, string>([
  ['cash', 'Efectivo'],
  ['credit_card', 'Tarjeta de crédito'],
  ['pse', 'PSE'],
  ['cash_reference', 'Referencia de pago'],
  ['cash_on_delivery', 'Pago contra entrega'],
  ['bank_transfer', 'Transferencia bancaria'],
  ['nequi', 'Nequi'],
] as const)

export function getPaymentMethodLabel(method?: PaymentMethod) {
  if (!method) {
    return 'Desconocido'
  }

  return paymentMethodLabels.get(method) || method
}
