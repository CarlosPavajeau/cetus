import { create } from 'zustand'
import type { ProductOptionType } from '@/api/products'
import type { CreateProductVariant } from '@/schemas/product'

export const TOTAL_STEPS = 4

type AdvanceProductRegistrationStore = {
  step: number
  productId: string
  selectedOptions: ProductOptionType[]
  variants: CreateProductVariant[]

  setProductId: (id: string) => void
  addProductOption: (option: ProductOptionType) => void
  removeProductOption: (option: ProductOptionType) => void

  addVariant: (variant: CreateProductVariant) => void

  reset: () => void
  nextStep: () => void
}

export const useAdvancedProductRegistrationStore =
  create<AdvanceProductRegistrationStore>((set) => ({
    step: 1,
    productId: '',
    selectedOptions: [],
    variants: [],
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
    addVariant: (variant) =>
      set((state) => ({
        variants: [...state.variants, variant],
      })),
    reset: () =>
      set({ productId: '', selectedOptions: [], variants: [], step: 1 }),
    nextStep: () =>
      set((state) => ({
        step: state.step >= TOTAL_STEPS ? 1 : state.step + 1,
      })),
  }))
