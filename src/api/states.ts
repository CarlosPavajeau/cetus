import axios from 'axios'

export type State = {
  id: string
  name: string
}

export const fetchStates = async () => {
  const response = await axios.get<State[]>(
    `${import.meta.env.PUBLIC_API_URL}/states`,
  )

  return response.data
}

export type City = {
  id: string
  name: string
}

export const fetchCities = async (stateId: string) => {
  const response = await axios.get<City[]>(
    `${import.meta.env.PUBLIC_API_URL}/states/${stateId}/cities`,
  )

  return response.data
}
