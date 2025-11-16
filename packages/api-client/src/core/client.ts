import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

export type ApiClientConfig = {
  baseUrl: string
  timeout?: number
  withCredentials?: boolean
  // Funciones inyectables para obtener datos externos
  getAccessToken?: () => string | null | Promise<string | null>
  getCurrentStore?: () => string | null | Promise<string | null>
  // Headers personalizados adicionales
  customHeaders?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>)
}

export class ApiClient {
  private readonly client: AxiosInstance
  private config: ApiClientConfig

  constructor(config: ApiClientConfig) {
    this.config = config
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30_000,
      withCredentials: config.withCredentials,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request Interceptor - Inyectar datos dinámicos
    this.client.interceptors.request.use(
      async (config) => {
        // 1. Inyectar Access Token
        if (this.config.getAccessToken) {
          const token = await this.config.getAccessToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }

        // 2. Inyectar Store Actual
        if (this.config.getCurrentStore) {
          const store = await this.config.getCurrentStore()
          if (store) {
            // Opción 1: Como header
            config.headers['X-Store-Id'] = store

            // Opción 2: Como query param (si tu API lo prefiere)
            // config.params = { ...config.params, store }
          }
        }

        // 3. Headers personalizados adicionales
        if (this.config.customHeaders) {
          const customHeaders =
            typeof this.config.customHeaders === 'function'
              ? await this.config.customHeaders()
              : this.config.customHeaders

          Object.assign(config.headers, customHeaders)
        }

        return config
      },
      (error) => Promise.reject(error),
    )

    // Response Interceptor - Manejar errores
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => Promise.reject(error),
    )
  }

  updateConfig(updates: Partial<ApiClientConfig>) {
    this.config = { ...this.config, ...updates }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async patch<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }
}
