import { API_ENDPOINT } from '@/shared/constants'
import axios from 'axios'

export type State = {
  id: string
  name: string
}

export const fetchStates = async () => {
  const response = await axios.get<State[]>(`${API_ENDPOINT}/states`)

  return response.data
}

export type City = {
  id: string
  name: string
}

export const fetchCities = async (stateId: string) => {
  const response = await axios.get<City[]>(
    `${API_ENDPOINT}/states/${stateId}/cities`,
  )

  return response.data
}
