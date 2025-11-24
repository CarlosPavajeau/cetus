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

  add: (product: CartItemProduct, quantity?: number) => boolean
  reduce: (product: CartItemProduct) => void
  remove: (product: CartItemProduct) => void

  clear: () => void
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      count: 0,
      add: (product, quantity) => {
        const { items } = get()

        const found = items.find(
          (item) => item.product.variantId === product.variantId,
        )
        const quantityToAdd = quantity ?? 1

        if (!Number.isFinite(quantityToAdd) || quantityToAdd <= 0) {
          return false
        }

        if (found) {
          if (found.quantity + quantityToAdd > product.stock) {
            return false
          }

          set((state) => ({
            items: state.items.map((item) =>
              item.product.variantId === product.variantId
                ? {
                    ...item,
                    quantity: item.quantity + quantityToAdd,
                  }
                : item,
            ),
            count: state.count + quantityToAdd,
          }))
        } else {
          // enforce stock on first add
          if (quantityToAdd > product.stock) {
            return false
          }

          set((state) => ({
            items: [...state.items, { product, quantity: quantityToAdd }],
            count: state.count + quantityToAdd,
          }))
        }

        return true
      },
      remove: (product) => {
        const { items } = get()

        const found = items.find(
          (item) => item.product.variantId === product.variantId,
        )

        if (found) {
          set((state) => ({
            items: state.items.filter(
              (item) => item.product.variantId !== product.variantId,
            ),
            count: state.count - found.quantity,
          }))
        }
      },
      reduce: (product) => {
        const { items } = get()

        const found = items.find(
          (item) => item.product.variantId === product.variantId,
        )

        if (found) {
          if (found.quantity > 1) {
            set((state) => ({
              items: state.items.map((item) =>
                item.product.variantId === product.variantId
                  ? {
                      ...item,
                      quantity: item.quantity - 1,
                    }
                  : item,
              ),
              count: state.count - 1,
            }))
          } else {
            set((state) => ({
              items: state.items.filter(
                (item) => item.product.variantId !== product.variantId,
              ),
              count: state.count - 1,
            }))
          }
        }
      },
      clear: () => {
        set(() => ({
          items: [],
          count: 0,
        }))
      },
    }),
    {
      name: 'cetus-cart',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
