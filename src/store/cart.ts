import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Product } from '@/api/products'

type CartItem = {
  product: Product
  quantity: number
}

type CartStore = {
  items: CartItem[]
  count: number

  add: (product: Product) => void
  reduce: (product: Product) => void
  remove: (product: Product) => void
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      count: 0,
      add: (product) => {
        const { items } = get()

        const item = items.find((item) => item.product.id === product.id)

        if (item) {
          set((state) => ({
            items: state.items.map((item) =>
              item.product.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                  }
                : item,
            ),
            count: state.count + 1,
          }))
        } else {
          set((state) => ({
            items: [...state.items, { product, quantity: 1 }],
            count: state.count + 1,
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
    }),
    {
      name: 'cetus-cart',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
)
