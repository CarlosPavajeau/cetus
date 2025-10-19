import {
  createFileRoute,
  ErrorComponent,
  Link,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { HomeIcon, HopIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import { getInvitation } from '@/functions/get-invitation'
import { getSession } from '@/functions/get-session'
import { authClient } from '@/shared/auth-client'

export const Route = createFileRoute('/accept-invitation/$id')({
  beforeLoad: async ({ params }) => {
    const session = await getSession()

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
    const invitation = await getInvitation({
      data: {
        id: params.id,
      },
    })

    if (invitation.error) {
      throw redirect({
        to: '/sign-in',
        search: {
          invitation: params.id,
        },
      })
    }

    return invitation.data
  },
  component: RouteComponent,
  errorComponent: ({ error }) => {
    if (error.message === 'You are not the recipient of the invitation') {
      return (
        <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
          <div className="m-auto h-fit w-full max-w-md overflow-hidden rounded-[calc(var(--radius)+.125rem)] border bg-muted dark:[--color-muted:var(--color-zinc-900)]">
            <div className="-m-px rounded-[calc(var(--radius)+.125rem)] border bg-card p-8 pb-6">
              <div className="text-center">
                <Link
                  aria-label="go home"
                  className="mx-auto block w-fit"
                  to="/"
                >
                  <HopIcon />
                </Link>
                <h1 className="mt-4 mb-1 font-semibold text-xl">
                  No puedes aceptar esta invitación
                </h1>
                <p className="text-sm">
                  No eres el destinatario de la invitación, verifica con la
                  persona que te la envió.
                </p>
              </div>

              <div className="mt-6 space-y-6">
                <Button asChild className="w-full">
                  <Link to="/app">
                    <HomeIcon />
                    Ir al panel de control
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
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
    <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
      <div className="m-auto h-fit w-full max-w-md overflow-hidden rounded-[calc(var(--radius)+.125rem)] border bg-muted dark:[--color-muted:var(--color-zinc-900)]">
        <div className="-m-px rounded-[calc(var(--radius)+.125rem)] border bg-card p-8 pb-6">
          <div className="text-center">
            <Link aria-label="go home" className="mx-auto block w-fit" to="/">
              <HopIcon />
            </Link>
            <h1 className="mt-4 mb-1 font-semibold text-xl">
              Has sido invitado a ser parte de{' '}
              <span className="font-semibold">
                {invitation.organizationName}
              </span>
            </h1>
            <p className="text-sm">
              Acepta la invitación para unirte a la organización.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2">
            <SubmitButton
              disabled={isLoading}
              isSubmitting={isLoading}
              onClick={rejectInvitation}
              variant="outline"
            >
              Rechazar invitación
            </SubmitButton>
            <SubmitButton
              disabled={isLoading}
              isSubmitting={isLoading}
              onClick={acceptInvitation}
            >
              Aceptar invitación
            </SubmitButton>
          </div>
        </div>
      </div>
    </section>
  )
}
