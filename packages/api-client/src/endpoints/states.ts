import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type { City, State } from '../types/states'

const definitions = {
  list: {
    method: 'GET',
    path: () => '/states',
  } as EndpointDefinition<State[]>,

  listCities: {
    method: 'GET',
    path: (stateId: string) => `/states/${stateId}/cities`,
  } as EndpointDefinition<City[], void, string>,

  getCity: {
    method: 'GET',
    path: (cityId: string) => `/states/cities/${cityId}`,
  } as EndpointDefinition<City, void, string>,
}

export const statesApi = defineResource(definitions)
