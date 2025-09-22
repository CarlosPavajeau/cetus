import type { ProductOptionType } from '@/api/products'
import { create } from 'zustand'

export const TOTAL_STEPS = 4

type AdvanceProductRegistrationStore = {
  step: number
  productId: string
  selectedOptions: ProductOptionType[]

  setProductId: (id: string) => void
  addProductOption: (option: ProductOptionType) => void
  removeProductOption: (option: ProductOptionType) => void

  reset: () => void
  nextStep: () => void
}

export const useAdvancedProductRegistrationStore =
  create<AdvanceProductRegistrationStore>((set) => ({
    step: 1,
    productId: '',
    selectedOptions: [],
    setProductId: (id) => set({ productId: id }),
    addProductOption: (option) =>
      set((state) => ({
        selectedOptions: [...state.selectedOptions, option],
      })),
    removeProductOption: (option) =>
      set((state) => ({
        selectedOptions: state.selectedOptions.filter(
          (o) => o.id !== option.id,
        ),
      })),
    reset: () => set({ productId: '', selectedOptions: [], step: 1 }),
    nextStep: () =>
      set((state) => ({
        step: state.step >= TOTAL_STEPS ? 1 : state.step + 1,
      })),
  }))
