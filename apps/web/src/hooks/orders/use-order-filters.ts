import { useCallback, useMemo, useReducer } from 'react'
import type { OrderStatus, SimpleOrder } from '@/api/orders'

type FilterState = {
  searchTerm: string
  statuses: OrderStatus[]
}

type FilterAction =
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'TOGGLE_STATUS'; payload: OrderStatus }
  | { type: 'RESET_FILTERS' }

const initialFilterState: FilterState = {
  searchTerm: '',
  statuses: ['pending', 'paid'],
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.payload }
    case 'TOGGLE_STATUS': {
      const exists = state.statuses.includes(action.payload)
      return {
        ...state,
        statuses: exists
          ? state.statuses.filter((status) => status !== action.payload)
          : [...state.statuses, action.payload],
      }
    }
    case 'RESET_FILTERS':
      return initialFilterState
    default:
      return state
  }
}

export function useOrderFilters(orders: SimpleOrder[] | undefined) {
  const [filterState, dispatch] = useReducer(filterReducer, initialFilterState)

  const filteredOrders = useMemo(() => {
    if (!orders) {
      return []
    }

    return orders.filter((order) => {
      const matchesSearch =
        filterState.searchTerm === '' ||
        order.orderNumber.toString().includes(filterState.searchTerm)

      const matchesStatus =
        filterState.statuses.length === 0 ||
        filterState.statuses.includes(order.status)

      return matchesSearch && matchesStatus
    })
  }, [orders, filterState.searchTerm, filterState.statuses])

  const handleSearch = useCallback((searchTerm: string) => {
    dispatch({ type: 'SET_SEARCH', payload: searchTerm })
  }, [])

  const handleStatusToggle = useCallback((status: OrderStatus) => {
    dispatch({ type: 'TOGGLE_STATUS', payload: status })
  }, [])

  return {
    filteredOrders,
    searchTerm: filterState.searchTerm,
    statuses: filterState.statuses,
    handleSearch,
    handleStatusToggle,
  }
}
