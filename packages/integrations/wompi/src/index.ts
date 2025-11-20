import { merchantsApi } from './merchants'
import { transactionsApi } from './transactions'

export const wompi = {
  transactions: transactionsApi,
  merchants: merchantsApi,
}
