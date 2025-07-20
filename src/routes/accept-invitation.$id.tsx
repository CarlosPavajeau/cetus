import { authClient } from '@/auth/auth-client'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { GetInvitation } from '@/server/get-invitation'
import { GetSession } from '@/server/get-session'
import {
  createFileRoute,
  ErrorComponent,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { HomeIcon, ShoppingCartIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/accept-invitation/$id')({
  beforeLoad: async ({ params }) => {
    const { session } = await GetSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
        search: {
          invitation: params.id,
        },
      })
    }

    return session
  },
  loader: async ({ params }) => {
    const invitation = await GetInvitation({
      data: {
        id: params.id,
      },
    })

    return invitation
  },
  component: RouteComponent,
  errorComponent: ({ error }) => {
    if (error.message === 'You are not the recipient of the invitation') {
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
                      No puedes aceptar esta invitación
                    </h1>

                    <p className="mb-8 text-muted-foreground text-sm">
                      No eres el destinatario de la invitación, verifica con la
                      persona que te la envió.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button asChild className="w-full">
                      <Link to="/app">
                        <HomeIcon />
                        Ir al panel de control
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return <ErrorComponent error={error} />
  },
})

function RouteComponent() {
  const invitation = Route.useLoaderData()
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(false)

  const acceptInvitation = async () => {
    setIsLoading(true)
    const result = await authClient.organization.acceptInvitation({
      invitationId: invitation.id,
    })

    setIsLoading(false)

    if (result.error) {
      toast.error('Error al aceptar la invitación')
      return
    }

    navigate({
      to: '/app',
    })
  }

  const rejectInvitation = async () => {
    setIsLoading(true)
    const result = await authClient.organization.rejectInvitation({
      invitationId: invitation.id,
    })

    setIsLoading(false)

    if (result.error) {
      toast.error('Error al rechazar la invitación')
      return
    }

    navigate({
      to: '/',
    })
  }

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
                  Has sido invitado a ser parte de{' '}
                  <span className="font-semibold">
                    {invitation.organizationName}
                  </span>
                </h1>

                <p className="mb-8 text-muted-foreground text-sm">
                  Acepta la invitación para unirte a la organización.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <SubmitButton
                  variant="secondary"
                  isSubmitting={isLoading}
                  disabled={isLoading}
                  onClick={rejectInvitation}
                >
                  Rechazar invitación
                </SubmitButton>
                <SubmitButton
                  isSubmitting={isLoading}
                  disabled={isLoading}
                  onClick={acceptInvitation}
                >
                  Aceptar invitación
                </SubmitButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
