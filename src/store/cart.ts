import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type CartItemProduct = {
  id: string
  name: string
  slug: string
  imageUrl: string
  price: number
  variantId: number
  stock: number
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

        const found = items.find((item) => item.product.id === product.id)
        const quantityToAdd = quantity ?? 1

        if (found) {
          if (found.quantity + quantityToAdd > product.stock) {
            return false
          }

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

        return true
      },
      remove: (product) => {
        const { items } = get()

        const found = items.find((item) => item.product.id === product.id)

        if (found) {
          set((state) => ({
            items: state.items.filter((item) => item.product.id !== product.id),
            count: state.count - found.quantity,
          }))
        }
      },
      reduce: (product) => {
        const { items } = get()

        const found = items.find((item) => item.product.id === product.id)

        if (found) {
          if (found.quantity > 1) {
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
