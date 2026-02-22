import type { Store } from '@cetus/api-client/types/stores'
import { CartButton } from '@cetus/web/components/cart-button'
import { Link } from '@tanstack/react-router'

type Props = {
  store: Store
  hasCustomDomain: boolean
}

export function FrontStoreHeader({ store, hasCustomDomain }: Props) {
  return (
    <header className="sticky top-0 z-50 border-border border-b bg-background/75 backdrop-blur-xl">
      <nav
        aria-label="Navegacion principal"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link
          className="inline-flex items-center gap-2 font-semibold text-foreground text-sm tracking-tight"
          params={{ store: store.slug }}
          resetScroll
          to={hasCustomDomain ? '/$store' : '/'}
        >
          <span className="inline-flex size-6 items-center justify-center rounded-md border border-border bg-accent text-xs">
            {store.name.charAt(0).toUpperCase()}
          </span>
          {store.name}
        </Link>

        <div className="flex items-center gap-2">
          <CartButton />
        </div>
      </nav>
    </header>
  )
}
