export const paymentStatusLabels = Object.freeze({
  pending: 'Pendiente',
  in_process: 'En proceso',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
  PENDING: 'Pendiente',
  APPROVED: 'Aprobado',
  DECLINED: 'Declinado',
  ERROR: 'Error',
} as const)

export const paymentMethodLabels = Object.freeze({
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  bank_transfer: 'Transferencia bancaria',
  cash: 'Efectivo',
  cash_on_delivery: 'Pago contra entrega',
  account_money: 'Dinero en cuenta',
  CARD: 'Tarjeta de crédito/débito',
  NEQUI: 'Nequi',
  BANCOLOMBIA_TRANSFER: 'Transferencia Bancolombia',
  PSE: 'PSE',
} as const)
