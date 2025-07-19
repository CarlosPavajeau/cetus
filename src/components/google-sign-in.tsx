import { authClient } from '@/auth/auth-client'
import { GoogleIcon } from '@/components/icons/google'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export function GoogleSignIn() {
  const [isLoading, setLoading] = useState(false)

  const signIn = async () => {
    setLoading(true)
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/app',
      newUserCallbackURL: '/app/welcome',
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
