import { env } from '@cetus/env/client'
import { useMemo, useState } from 'react'
import { GoogleIcon } from '@/components/icons/google'
import { Button } from '@/components/ui/button'
import { authClient } from '@/shared/auth-client'

type Props = {
  invitation?: string
}

export function GoogleSignIn({ invitation }: Readonly<Props>) {
  const [isLoading, setIsLoading] = useState(false)

  const callbackUrl = useMemo(() => {
    if (invitation) {
      return `${env.VITE_APP_URL}/accept-invitation/${invitation}`
    }
    return `${env.VITE_APP_URL}/app`
  }, [invitation])

  const newUserCallbackURL = useMemo(() => {
    if (invitation) {
      return `${env.VITE_APP_URL}/accept-invitation/${invitation}`
    }
    return `${env.VITE_APP_URL}/onboarding`
  }, [invitation])

  const signIn = async () => {
    setIsLoading(true)
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: callbackUrl,
      newUserCallbackURL,
    })

    setTimeout(() => {
      setIsLoading(false)
    }, 2000)
  }
  return (
    <Button disabled={isLoading} onClick={signIn} variant="outline">
      <GoogleIcon className="h-5 w-5" />
      <span className="whitespace-nowrap">Google</span>
    </Button>
  )
}
