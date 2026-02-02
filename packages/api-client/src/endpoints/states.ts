import { anonymousClient } from '../core/instance'
import type { City, State } from '../types/states'

export const statesApi = {
  list: () => anonymousClient.get<State[]>('/states'),

  listCities: (stateId: string) =>
    anonymousClient.get<City[]>(`/states/${stateId}/cities`),

  getCity: (cityId: string) =>
    anonymousClient.get<City>(`/states/cities/${cityId}`),
}
