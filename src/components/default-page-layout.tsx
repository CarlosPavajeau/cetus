import { ThemeSwitch } from '@/components/theme-switch'
import { Separator } from '@/components/ui/separator'
import { SignedIn } from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import { LayoutDashboardIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { CartButton } from './cart-button'
import { Button } from './ui/button'

type Props = {
  children: ReactNode
  showHeader?: boolean
}

export function DefaultPageLayout({ children, showHeader = true }: Props) {
  return (
    <div className="min-h-screen">
      {showHeader && <NavBar />}

      <main className="container mx-auto bg-background px-4 pt-6 pb-16 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 w-full border border-b transition-all duration-300 ${isScrolled ? 'bg-card shadow-md' : 'bg-card/90 backdrop-blur-sm'}`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex flex-shrink-0 items-center">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="font-bold font-heading text-foreground text-xl sm:text-2xl">
                TELEDIGITAL JYA
              </h1>
            </Link>
          </div>

          <div className="flex h-6 items-center space-x-6">
            <ThemeSwitch />

            <Separator orientation="vertical" className="h-6" />
            <SignedIn>
              <Button
                variant="outline"
                size="icon"
                className="relative"
                aria-label="start"
                asChild
              >
                <Link to="/app">
                  <LayoutDashboardIcon />
                </Link>
              </Button>
            </SignedIn>

            <CartButton />
          </div>
        </div>
      </div>
    </header>
  )
}
