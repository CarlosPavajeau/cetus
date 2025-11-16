import { awsApi } from './endpoints/aws'
import { categoriesApi } from './endpoints/categories'
import { couponsApi } from './endpoints/coupons'
import { customersApi } from './endpoints/customers'
import { ordersApi } from './endpoints/orders'
import { productsApi } from './endpoints/products'
import { reviewsApi } from './endpoints/reviews'
import { statesApi } from './endpoints/states'
import { storesApi } from './endpoints/stores'

export const api = {
  aws: awsApi,
  categories: categoriesApi,
  coupons: couponsApi,
  customers: customersApi,
  orders: ordersApi,
  products: productsApi,
  reviews: reviewsApi,
  states: statesApi,
  stores: storesApi,
}
