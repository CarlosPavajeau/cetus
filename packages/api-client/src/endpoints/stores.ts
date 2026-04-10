import { defineResource } from '../core/define-resource'
import type { EndpointDefinition } from '../core/types'
import type {
  ConfigureMercadoPagoRequest,
  ConfigureWompiCredentialsValues,
  CreateStoreRequest,
  Store,
  UpdateStoreValues,
} from '../types/stores'

const definitions = {
  create: {
    method: 'POST',
    path: '/stores',
  } as EndpointDefinition<void, CreateStoreRequest>,

  update: {
    method: 'PUT',
    path: (id: string) => `/stores/${id}`,
  } as EndpointDefinition<Store, UpdateStoreValues, string>,

  configureMercadopago: {
    method: 'PUT',
    path: '/stores/payment-providers/mercado-pago/credentials',
  } as EndpointDefinition<void, ConfigureMercadoPagoRequest>,

  configureWompi: {
    method: 'PUT',
    path: '/stores/payment-providers/wompi/credentials',
  } as EndpointDefinition<void, ConfigureWompiCredentialsValues>,

  getByDomain: {
    method: 'GET',
    path: (domain: string) => `/stores/by-domain/${domain}`,
  } as EndpointDefinition<Store, void, string>,

  getBySlug: {
    method: 'GET',
    path: (slug: string) => `/stores/by-slug/${slug}`,
  } as EndpointDefinition<Store, void, string>,

  getById: {
    method: 'GET',
    path: (id: string) => `/stores/${id}`,
  } as EndpointDefinition<Store, void, string>,

  getByExternalId: {
    method: 'GET',
    path: (externalId: string) => `/stores/by-external-id/${externalId}`,
  } as EndpointDefinition<Store, void, string>,

  getMercadoPagoAuthorizationUrl: {
    method: 'GET',
    path: '/stores/payment-providers/mercado-pago/authorization-url',
  } as EndpointDefinition<string, void>,
}

export const storesApi = defineResource(definitions)
