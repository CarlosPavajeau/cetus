import { authClient } from '@/auth/auth-client'
import { GoogleIcon } from '@/components/icons/google'
import { Button } from '@/components/ui/button'
import { useMemo, useState } from 'react'

type Props = {
  invitation?: string
}

export function GoogleSignIn({ invitation }: Props) {
  const [isLoading, setLoading] = useState(false)

  const callbackUrl = useMemo(() => {
    if (invitation) {
      return `/accept-invitation/${invitation}`
    }
    return '/app'
  }, [invitation])

  const newUserCallbackURL = useMemo(() => {
    if (invitation) {
      return `/accept-invitation/${invitation}`
    }
    return '/onboarding'
  }, [invitation])

  const signIn = async () => {
    setLoading(true)
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: callbackUrl,
      newUserCallbackURL: newUserCallbackURL,
    })

    setTimeout(() => {
      setLoading(false)
    }, 2000)
  }
  return (
    <Button
      size="lg"
      variant="outline"
      className="w-full"
      onClick={signIn}
      disabled={isLoading}
    >
      <GoogleIcon className="h-5 w-5" />
      <span className="whitespace-nowrap">Continuar con Google</span>
    </Button>
  )
}
