import { AxiosError } from 'axios'

/**
 * Extracts the error detail message from an AxiosError or other error objects.
 * @param error The error object to extract details from.
 * @returns The error detail message, or a generic message if not found.
 */
function hasDetailProperty(data: unknown): data is { detail: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'detail' in data &&
    typeof (data as { detail: unknown }).detail === 'string'
  )
}

export function extractErrorDetail(error: unknown): string {
  if (error instanceof AxiosError && error.response) {
    const data = error.response.data
    if (hasDetailProperty(data)) {
      return data.detail
    }
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}
