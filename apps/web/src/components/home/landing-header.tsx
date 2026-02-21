import { Button } from '@cetus/ui/button'
import { Link } from '@tanstack/react-router'

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-border border-b bg-background/75 backdrop-blur-xl">
      <nav
        aria-label="Navegacion principal"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link
          className="inline-flex items-center gap-2 font-semibold text-foreground text-sm tracking-tight"
          resetScroll
          to="/"
        >
          <span className="inline-flex size-6 items-center justify-center rounded-md border border-border bg-accent text-xs">
            C
          </span>
          Cetus
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild>
            <Link to="/sign-in">
              <span className="text-nowrap">Iniciar sesión</span>
            </Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
