import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/clerk-react'
import { Link } from '@tanstack/react-router'

export const AppNav = () => {
  return (
    <header className="mb-10 items-center border-border border-b">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center space-x-8">
          <div>
            <h1 className="font-bold text-xl">Cetus</h1>
          </div>

          <div className="flex space-x-4">
            <Link to="/app">Inicio</Link>
            <Link to="/app/products/new">Crear producto</Link>
          </div>
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
