import { paymentMethodLabels, paymentStatusLabels } from '../constants/payment'

function createLabelGetter(labelMap: Map<string, string>) {
  return (key?: string) => {
    if (!key) {
      return 'Desconocido'
    }
    return labelMap.get(key) || key
  }
}

export const paymentStatusLabel = createLabelGetter(paymentStatusLabels)

export const getPaymentMethodLabel = createLabelGetter(paymentMethodLabels)
