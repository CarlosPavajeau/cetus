import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment'

export function paymentStatusLabel(status?: string) {
  if (!status) {
    return 'Desconocido'
  }

  return paymentStatusLabels.get(status) || status
}

export function getPaymentMethodLabel(method?: string) {
  if (!method) {
    return 'Desconocido'
  }

  return paymentMethodLabels.get(method) || method
}
