import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react'

export const AppNav = () => {
  return (
    <header className="mb-10 items-center border-border border-b">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div>
          <h1 className="font-bold text-xl">Cetus</h1>
        </div>
        <div>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <RedirectToSignIn />
          </SignedOut>
        </div>
      </div>
    </header>
  )
}
