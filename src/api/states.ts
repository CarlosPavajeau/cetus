import { api } from '@/api/client'

export type State = {
  id: string
  name: string
}

export const fetchStates = async () => {
  const response = await api.get<State[]>(`/states`)

  return response.data
}

export type City = {
  id: string
  name: string
}

export const fetchCities = async (stateId: string) => {
  const response = await api.get<City[]>(`/states/${stateId}/cities`)

  return response.data
}
