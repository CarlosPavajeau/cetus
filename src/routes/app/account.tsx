import { authClient } from '@/auth/auth-client'
import { InviteMemberDialog } from '@/components/auth/invite-member-dialog'
import { MemberCard } from '@/components/auth/member-card'
import { AccountSkeleton } from '@/components/skeletons/account-skeleton'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-muted-foreground text-xs">Nombre</p>
                <p className="font-medium text-sm">{organization.name}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Slug</p>
                <p className="text-sm">{organization.slug}</p>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="font-heading font-semibold text-lg">Miembros</p>

                {(isOwner || isAdmin) && <InviteMemberDialog />}
              </div>

              <div className="flex flex-col gap-1">
                {organization.members.map((member) => (
                  <MemberCard
                    isOwner={isOwner}
                    key={member.id}
                    member={member}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Fragment>
  )
}
