import { GoogleSignIn } from '@/components/google-sign-in'
import { createFileRoute } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'

export const Route = createFileRoute('/sign-in')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="h-screen p-2">
      <header className="lef-0 absolute top-0 z-30 w-full">
        <div className="p-6 md:p-8">
          <ShoppingCartIcon className="h-8 w-auto" />
        </div>
      </header>

      <div className="flex h-full">
        <div className="relative w-full">
          <div className="relative z-10 flex h-full items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
              <div className="text-center">
                <h1 className="mb-4 font-heading text-lg">
                  Bienvenido a Cetus
                </h1>

                <p className="mb-8 text-muted-foreground text-sm">
                  Inicia sesión para continuar al panel de control
                </p>
              </div>

              <div className="space-y-4">
                <GoogleSignIn />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
