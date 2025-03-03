import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

const PUBLISHABLE_KEY = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY

export function ClerkProvider({ children }: Props) {
  const { theme } = useTheme()
  return (
    <BaseClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        baseTheme: theme === 'dark' ? dark : undefined,
      }}
    >
      {children}
    </BaseClerkProvider>
  )
}
