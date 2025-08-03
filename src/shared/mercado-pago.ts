const mercadoPagoPaymentStatusLabels = new Map<string, string>([
  ['pending', 'Pendiente'],
  ['in_process', 'En proceso'],
  ['approved', 'Aprobado'],
  ['rejected', 'Rechazado'],
  ['refunded', 'Reembolsado'],
  ['cancelled', 'Cancelado'],
] as const)

export function getMercadoPagoPaymentStatusLabel(status?: string) {
  if (!status) {
    return 'Desconocido'
  }

  return mercadoPagoPaymentStatusLabels.get(status) || status
}

const mercadoPagoPaymentMethodLabels = new Map<string, string>([
  ['credit_card', 'Tarjeta de crédito'],
  ['debit_card', 'Tarjeta de débito'],
  ['bank_transfer', 'Transferencia bancaria'],
  ['cash', 'Efectivo'],
  ['account_money', 'Dinero en cuenta'],
] as const)

export function getMercadoPagoPaymentMethodLabel(method?: string) {
  if (!method) {
    return 'Desconocido'
  }

  return mercadoPagoPaymentMethodLabels.get(method) || method
}

const mercadoPagoPaymentFeeLabels = new Map<string, string>([
  ['mercadopago_fee', 'Comisión de Mercado Pago'],
  ['application_fee', 'Comisión de aplicación'],
] as const)

export function getMercadoPagoPaymentFeeLabel(fee?: string) {
  if (!fee) {
    return 'Desconocido'
  }

  return mercadoPagoPaymentFeeLabels.get(fee) || fee
}
