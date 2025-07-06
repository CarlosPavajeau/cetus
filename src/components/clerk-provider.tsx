import { ClerkProvider as BaseClerkProvider } from '@clerk/tanstack-react-start'
import { dark } from '@clerk/themes'
import { useTheme } from 'next-themes'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export function ClerkProvider({ children }: Props) {
  const { theme } = useTheme()
  return (
    <BaseClerkProvider
      appearance={{
        baseTheme: theme === 'dark' ? dark : undefined,
      }}
    >
      {children}
    </BaseClerkProvider>
  )
}
