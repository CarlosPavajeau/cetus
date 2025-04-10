import { Link } from '@tanstack/react-router'
import { HomeIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { CartButton } from './cart-button'
import { ThemeSwitch } from './theme-switch'
import { Button } from './ui/button'

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
    <>
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

            <div className="flex items-center gap-4">
              <ThemeSwitch />

              <hr className="h-6 w-[1px] bg-border" />

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
      <main className="mx-auto max-w-7xl grow px-4 sm:px-6 lg:px-8">
        <div>{children}</div>
      </main>
    </>
  )
}
