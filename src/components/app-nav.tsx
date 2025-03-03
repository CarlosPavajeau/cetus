import {
  OrganizationSwitcher,
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'
import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

export const AppNav = () => {
  return (
    <header className="before:-inset-x-32 relative mb-14 before:absolute before:bottom-0 before:h-px before:bg-[linear-gradient(to_right,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))]">
      <div
        className="before:-bottom-px before:-left-12 before:-ml-px after:-right-12 after:-bottom-px after:-mr-px before:absolute before:z-10 before:size-[3px] before:bg-ring/50 after:absolute after:z-10 after:size-[3px] after:bg-ring/50"
        aria-label="hidden"
      ></div>

      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="font-bold font-heading text-2xl text-foreground">
            Cetus
          </h1>
        </Link>

        <div className="flex items-center gap-4 sm:gap-8">
          <SignedIn>
            <div className="flex items-center gap-4">
              <UserButton />

              <hr className="h-6 w-[1px] bg-foreground/10" />

              <OrganizationSwitcher />
            </div>
          </SignedIn>

          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </div>
      </div>

      <SignedIn>
        <Tabs defaultValue="app">
          <TabsList className="h-auto gap-2 rounded-none border-b bg-transparent px-0 py-1 text-foreground">
            <TabsTrigger
              value="app"
              className="after:-mb-1 relative after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent data-[state=active]:after:bg-primary"
              asChild
            >
              <Link to="/app">Pedidos</Link>
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="after:-mb-1 relative after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:bg-accent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:hover:bg-accent data-[state=active]:after:bg-primary"
              asChild
            >
              <Link to="/app/products">Productos</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </SignedIn>
    </header>
  )
}
