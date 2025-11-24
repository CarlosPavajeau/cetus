import { authClient } from '@cetus/auth/client'
import { Alert, AlertTitle } from '@cetus/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@cetus/ui/avatar'
import { Card, CardContent } from '@cetus/ui/card'
import { Separator } from '@cetus/ui/separator'
import { AccountSkeleton } from '@cetus/web/components/skeletons/account-skeleton'
import { MembersList } from '@cetus/web/features/auth/components/members-list'
import { EditStoreForm } from '@cetus/web/features/stores/components/edit-store-form'
import { createFileRoute } from '@tanstack/react-router'
import { Fragment } from 'react/jsx-runtime'

export const Route = createFileRoute('/app/account')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session, isPending } = authClient.useSession()
  const { data: organization, isPending: isOrgPending } =
    authClient.useActiveOrganization()

  if (isPending || isOrgPending) {
    return <AccountSkeleton />
  }

  if (!session) {
    return (
      <Alert>
        <AlertTitle>Error al cargar la sesión</AlertTitle>
      </Alert>
    )
  }

  if (!organization) {
    return (
      <Alert>
        <AlertTitle>Error al cargar la organización</AlertTitle>
      </Alert>
    )
  }

  const user = session.user
  const currentUserRole = organization.members.find(
    (m) => m.userId === user.id,
  )?.role
  const isOwner = currentUserRole === 'owner'
  const isAdmin = currentUserRole === 'admin'

  return (
    <Fragment>
      <h1 className="mb-4 font-heading font-semibold text-2xl">
        Configuración de la cuenta
      </h1>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading font-semibold text-lg">Datos personales</h2>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div>
              <Avatar className="size-14">
                <AvatarImage alt={user.name} src={user.image ?? undefined} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-muted-foreground text-xs">Nombre</p>
                <p className="font-medium text-sm">{session.user.name}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="text-sm">{session.user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="font-heading font-semibold text-lg">Tienda</h2>

        <Card>
          <CardContent className="flex flex-col gap-4">
            <EditStoreForm />

            <Separator />

            <MembersList
              isAdmin={isAdmin}
              isOwner={isOwner}
              members={organization.members}
            />
          </CardContent>
        </Card>
      </div>
    </Fragment>
  )
}
