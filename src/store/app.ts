import type { Store } from '@/api/stores'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type AppStore = {
  currentStore?: Store
  setCurrentStore: (store: Store) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentStore: undefined,
      setCurrentStore: (store) =>
        set({
          currentStore: store,
        }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
