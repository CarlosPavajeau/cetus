import axios, { type AxiosInstance } from 'axios'
import { getBaseURL, getWompiConfig } from './config'

let wompiClient: AxiosInstance | null = null

export function getWompiClient(): AxiosInstance {
  if (!wompiClient) {
    const config = getWompiConfig()

    wompiClient = axios.create({
      baseURL: getBaseURL(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.publicKey}`,
      },
    })
  }

  return wompiClient
}
