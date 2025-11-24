export type WompiConfig = {
  publicKey: string
  privateKey?: string
  environment: 'production' | 'sandbox'
  currency?: string
}

let _config: WompiConfig | null = null

export function setWompiConfig(wompiConfig: WompiConfig) {
  _config = wompiConfig
}

export function getWompiConfig(): WompiConfig {
  if (!_config) {
    throw new Error('Wompi config not initialized. Call setWompiConfig first.')
  }
  return _config
}

export function getBaseURL(): string {
  const config = getWompiConfig()

  return config.environment === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1'
}
