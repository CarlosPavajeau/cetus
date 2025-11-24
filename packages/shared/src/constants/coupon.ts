export const defaultCouponCharacters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const couponDiscountTypeLabels = Object.freeze({
  percentage: 'Porcentaje',
  fixed_amount: 'Monto fijo',
  free_shipping: 'Envío gratis',
})

export const couponRuleTypeLabels = Object.freeze({
  min_purchase_amount: 'Monto mínimo de compra',
  specific_product: 'Producto específico',
  specific_category: 'Categoría específica',
  one_per_customer: 'Un cupón por cliente',
})
