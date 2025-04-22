import { CartButton } from '@/components/cart-button'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SignedIn } from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import { HomeIcon, LayoutDashboardIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

type Props = {
  children: ReactNode
  showHeader?: boolean
  showCart?: boolean
  stickyHeader?: boolean
}

export function DefaultPageLayout({
  children,
  showCart,
  showHeader = true,
  stickyHeader = true,
}: Props) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    if (stickyHeader) {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    }
  }, [stickyHeader])

  return (
    <main className="overflow-hidden px-4 supports-[overflow:clip]:overflow-clip sm:px-6">
      {showHeader && (
        <header
          className={`before:-inset-x-32 relative mb-14 before:absolute before:bottom-0 before:h-px before:bg-[linear-gradient(to_right,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))] ${
            stickyHeader
              ? `${
                  isScrolled
                    ? 'sticky top-0 z-40 bg-background/90 backdrop-blur-sm transition-all duration-200'
                    : 'sticky top-0 z-40 transition-all duration-200'
                }`
              : ''
          }`}
          role="banner"
        >
          <div className="flex h-[72px] w-full items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="font-bold font-heading text-foreground text-xl sm:text-2xl">
                TELEDIGITAL JYA
              </h1>
            </Link>

            <div className="flex h-9 items-center gap-4">
              <ThemeSwitch />

              <Separator orientation="vertical" />

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

              {!showCart && (
                <nav
                  className="flex items-center gap-4 sm:gap-8"
                  aria-label="Main navigation"
                >
                  <Button
                    variant="outline"
                    size="icon"
                    className="relative"
                    aria-label="start"
                    asChild
                  >
                    <Link to="/">
                      <HomeIcon size={16} aria-hidden="true" />
                    </Link>
                  </Button>
                </nav>
              )}

              {showCart && (
                <div className="flex items-center gap-4 sm:gap-8">
                  <CartButton />
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <main className="container mx-auto">{children}</main>
    </main>
  )
}
