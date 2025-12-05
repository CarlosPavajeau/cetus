import type { ProductOptionValue } from '@cetus/api-client/types/products'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartItemProduct = {
  productId: string
  name: string
  slug: string
  imageUrl: string
  price: number
  variantId: number
  stock: number
  optionValues: ProductOptionValue[]
}

export type CartItem = {
  product: CartItemProduct
  quantity: number
}

type CartStore = {
  items: CartItem[]
  count: number
  totalPrice: number

  add: (product: CartItemProduct, quantity?: number) => boolean
  reduce: (product: CartItemProduct) => void
  remove: (product: CartItemProduct) => void
  clear: () => void
  getItem: (variantId: number) => CartItem | undefined
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => {
      const updateDerivedState = (items: CartItem[]) => {
        const count = items.reduce((sum, item) => sum + item.quantity, 0)
        const totalPrice = items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0,
        )
        return { count, totalPrice }
      }

      return {
        items: [],
        count: 0,
        totalPrice: 0,

        add: (product, quantity = 1) => {
          if (!Number.isFinite(quantity) || quantity <= 0) {
            return false
          }

          const { items } = get()
          const existingItem = items.find(
            (item) => item.product.variantId === product.variantId,
          )
          const newQuantity = (existingItem?.quantity ?? 0) + quantity

          if (newQuantity > product.stock) {
            return false // Not enough stock
          }

          const updatedItems = existingItem
            ? items.map((item) =>
                item.product.variantId === product.variantId
                  ? { ...item, quantity: newQuantity }
                  : item,
              )
            : [...items, { product, quantity }]

          set({
            items: updatedItems,
            ...updateDerivedState(updatedItems),
          })

          return true
        },

        remove: (product) => {
          const { items } = get()
          const updatedItems = items.filter(
            (item) => item.product.variantId !== product.variantId,
          )

          if (updatedItems.length < items.length) {
            set({
              items: updatedItems,
              ...updateDerivedState(updatedItems),
            })
          }
        },

        reduce: (product) => {
          const { items } = get()
          const existingItem = items.find(
            (item) => item.product.variantId === product.variantId,
          )

          if (!existingItem) {
            return
          }

          const updatedItems =
            existingItem.quantity > 1
              ? items.map((item) =>
                  item.product.variantId === product.variantId
                    ? { ...item, quantity: item.quantity - 1 }
                    : item,
                )
              : items.filter(
                  (item) => item.product.variantId !== product.variantId,
                )

          set({
            items: updatedItems,
            ...updateDerivedState(updatedItems),
          })
        },

        clear: () => {
          set({
            items: [],
            count: 0,
            totalPrice: 0,
          })
        },

        getItem: (variantId: number) =>
          get().items.find((item) => item.product.variantId === variantId),
      }
    },
    {
      name: 'cetus-cart',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
