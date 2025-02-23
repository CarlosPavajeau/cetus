import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react'

export const AppNav = () => {
  return (
    <header>
      <div className="bg-gray-800 text-white">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="font-bold text-3xl">App</h1>
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
      </div>
    </header>
  )
}
