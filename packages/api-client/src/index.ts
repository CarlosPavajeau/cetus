import { awsApi } from './endpoints/aws'
import { categoriesApi } from './endpoints/categories'
import { couponsApi } from './endpoints/coupons'
import { customersApi } from './endpoints/customers'
import { inventoryApi } from './endpoints/inventory'
import { ordersApi } from './endpoints/orders'
import { paymentLinksApi } from './endpoints/payment-links'
import { productsApi } from './endpoints/products'
import { reportsApi } from './endpoints/reports'
import { reviewsApi } from './endpoints/reviews'
import { statesApi } from './endpoints/states'
import { storesApi } from './endpoints/stores'

export const api = {
  aws: awsApi,
  categories: categoriesApi,
  coupons: couponsApi,
  customers: customersApi,
  inventory: inventoryApi,
  orders: ordersApi,
  paymentLinks: paymentLinksApi,
  products: productsApi,
  reports: reportsApi,
  reviews: reviewsApi,
  states: statesApi,
  stores: storesApi,
}
