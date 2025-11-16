import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment'

function createLabelGetter(labelMap: Record<string, string>) {
  return (key?: string) => {
    if (!key) {
      return 'Desconocido'
    }
    return labelMap[key] || key
  }
}

export const paymentStatusLabel = createLabelGetter(paymentStatusLabels)

export const getPaymentMethodLabel = createLabelGetter(paymentMethodLabels)
