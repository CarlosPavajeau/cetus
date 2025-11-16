import { anonymousClient, authenticatedClient } from '../core/instance'
import type {
  ConfigureMercadoPagoRequest,
  ConfigureWompiCredentialsValues,
  CreateStoreRequest,
  Store,
  UpdateStoreValues,
} from '../types/stores'

export const storesApi = {
  create: (data: CreateStoreRequest) =>
    authenticatedClient.post('/stores', data),

  update: (id: string, data: UpdateStoreValues) =>
    authenticatedClient.put<Store>(`/stores/${id}`, data),

  configureMercadopago: (config: ConfigureMercadoPagoRequest) =>
    authenticatedClient.put(
      '/stores/payment-providers/mercado-pago/credentials',
      config,
    ),

  configureWompi: (config: ConfigureWompiCredentialsValues) =>
    authenticatedClient.put(
      '/stores/payment-providers/wompi/credentials',
      config,
    ),

  getByDomain: (domain: string) =>
    anonymousClient.get<Store>(`/stores/by-domain/${domain}`),

  getBySlug: (slug: string) =>
    anonymousClient.get<Store>(`/stores/by-slug/${slug}`),

  getById: (id: string) => anonymousClient.get<Store>(`/stores/${id}`),

  getByExternalId: (externalId: string) =>
    anonymousClient.get<Store>(`/stores/by-external-id/${externalId}`),
}
