import { useQuery } from '@tanstack/react-query'

export const generateIntegritySignature = async (
  reference: string,
  amount: number,
  integritySecret: string,
) => {
  const data = `${reference}${amount}COP${integritySecret}`

  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))

  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

export const useGenerateIntegritySignature = (
  reference: string,
  amount: number,
  integritySecret: string,
) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [
      'generateIntegritySignature',
      reference,
      amount,
      integritySecret,
    ],
    queryFn: () =>
      generateIntegritySignature(reference, amount, integritySecret),
  })

  return {
    signature: data,
    isLoading,
    error,
  }
}
