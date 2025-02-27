import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { ProductForSale } from '@/api/products'

type CartItem = {
  product: ProductForSale
  quantity: number
}

type CartStore = {
  items: CartItem[]
  count: number

  add: (product: ProductForSale, quantity?: number) => void
  reduce: (product: ProductForSale) => void
  remove: (product: ProductForSale) => void

  clear: () => void
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      count: 0,
      add: (product, quantity) => {
        const { items } = get()

        const item = items.find((item) => item.product.id === product.id)
        const quantityToAdd = quantity ?? 1

        if (item) {
          set((state) => ({
            items: state.items.map((item) =>
              item.product.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + quantityToAdd,
                  }
                : item,
            ),
            count: state.count + quantityToAdd,
          }))
        } else {
          set((state) => ({
            items: [...state.items, { product, quantity: quantityToAdd }],
            count: state.count + quantityToAdd,
          }))
        }
      },
      remove: (product) => {
        const { items } = get()

        const item = items.find((item) => item.product.id === product.id)

        if (item) {
          set((state) => ({
            items: state.items.filter((item) => item.product.id !== product.id),
            count: state.count - item.quantity,
          }))
        }
      },
      reduce: (product) => {
        const { items } = get()

        const item = items.find((item) => item.product.id === product.id)

        if (item) {
          if (item.quantity > 1) {
            set((state) => ({
              items: state.items.map((item) =>
                item.product.id === product.id
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
                (item) => item.product.id !== product.id,
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
