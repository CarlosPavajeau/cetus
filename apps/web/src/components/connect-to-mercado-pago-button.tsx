import { useMutation } from '@tanstack/react-query'
import { fetchMercadoPagoAuthorizationUrl } from '@/api/stores'
import { SubmitButton } from './submit-button'

export function ConnectToMercadoPagoButton() {
  const { mutate, isPending } = useMutation({
    mutationKey: ['stores', 'mercado-pago', 'auth'],
    mutationFn: fetchMercadoPagoAuthorizationUrl,
    onSuccess: (authorizationUrl) => {
      window.location.href = authorizationUrl
    },
  })

  const linkToMercadoPago = () => {
    mutate()
  }

  return (
    <SubmitButton
      disabled={isPending}
      isSubmitting={isPending}
      onClick={linkToMercadoPago}
      size="sm"
      type="button"
    >
      Conectar con Mercado Pago
    </SubmitButton>
  )
}
