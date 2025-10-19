import consola from 'consola'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { fetchStoreByDomain, fetchStoreBySlug, type Store } from '@/api/stores'

type TenantStore = {
  store?: Store
  status: 'idle' | 'loading' | 'success' | 'error' | 'cleaned'
  actions: {
    fetchAndSetStore: (identifier: string) => Promise<Store>
    clearStore: () => void
    setStore: (store: Store) => void
  }
}

const domainRegex = /^[a-z0-9]+([-.][a-z0-9]+)*\.[a-z]{2,}$/i

function isDomain(identifier: string): boolean {
  return domainRegex.test(identifier) || identifier.includes('localhost')
}

export const useTenantStore = create<TenantStore>()(
  persist(
    (set, get) => ({
      store: undefined,
      status: 'idle',
      actions: {
        fetchAndSetStore: async (identifier) => {
          set({ status: 'loading' })
          try {
            let store: Store | undefined
            if (isDomain(identifier)) {
              store = await fetchStoreByDomain(identifier)
            } else {
              store = await fetchStoreBySlug(identifier)
            }

            set({ store, status: 'success' })
            return store
          } catch (error) {
            consola.error('Failed to fetch store', error)
            get().actions.clearStore()
            set({ status: 'error' })
            throw error
          }
        },
        clearStore: () => {
          set({ store: undefined, status: 'cleaned' })
        },
        setStore: (store) => {
          set({ store, status: 'success' })
        },
      },
    }),
    {
      name: 'store-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ store: state.store, status: state.status }),
    },
  ),
)

export const useTenantStoreActions = () =>
  useTenantStore((state) => state.actions)
