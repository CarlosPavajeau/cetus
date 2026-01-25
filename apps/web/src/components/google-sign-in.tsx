import { authClient } from '@cetus/auth/client'
import { Button } from '@cetus/ui/button'
import { GoogleIcon } from '@cetus/web/components/icons/google'
import { useMemo, useState } from 'react'

type Props = {
  invitation?: string
}

export function GoogleSignIn({ invitation }: Readonly<Props>) {
  const [isLoading, setIsLoading] = useState(false)

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
    <Button disabled={isLoading} onClick={signIn} size="lg" variant="outline">
      <GoogleIcon className="h-5 w-5" />
      <span className="whitespace-nowrap">Google</span>
    </Button>
  )
}
