import { api } from '@cetus/api-client'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { useMutation } from '@tanstack/react-query'

export function ConnectToMercadoPagoButton() {
  const { mutate, isPending } = useMutation({
    mutationKey: ['stores', 'mercado-pago', 'auth'],
    mutationFn: api.stores.getMercadoPagoAuthorizationUrl,
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
