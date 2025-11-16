export type Store = {
  id: string
  name: string
  slug: string
  customDomain?: string
  logoUrl?: string
  address?: string
  phone?: string
  email?: string
  wompiPublicKey?: string
  wompiPrivateKey?: string
  wompiEventsKey?: string
  wompiIntegrityKey?: string
  isConnectedToMercadoPago: boolean
}

export type ConfigureMercadoPagoRequest = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export type CreateStoreRequest = {
  name: string
  slug: string
  externalId: string
}

export type UpdateStoreValues = {
  id: string
  name: string
  description?: string | undefined
  address?: string | undefined
  phone?: string | undefined
  email?: string | undefined
  customDomain?: string | undefined
}

export type ConfigureWompiCredentialsValues = {
  publicKey: string
  privateKey: string
  eventsKey: string
  integrityKey: string
}
