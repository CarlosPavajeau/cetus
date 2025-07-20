import { authClient } from '@/auth/auth-client'
import { AccountSkeleton } from '@/components/skeletons/account-skeleton'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { BUILT_IN_ROLES } from '@/shared/constants'
import { createFileRoute } from '@tanstack/react-router'
import { UserCog2, UserPlus2Icon } from 'lucide-react'
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
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
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
                <Button size="sm">
                  <UserPlus2Icon />
                  Invitar miembro
                </Button>
              </div>

              <div className="flex flex-col gap-1">
                {organization.members.map((member) => (
                  <Card key={member.id} className="py-2">
                    <CardContent className="flex items-center justify-between gap-4 px-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <Avatar>
                            <AvatarImage
                              src={member.user.image ?? undefined}
                              alt={member.user.name}
                            />
                            <AvatarFallback>
                              {member.user.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col">
                            <p className="font-semibold text-sm">
                              {member.user.name}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {BUILT_IN_ROLES.find(
                            (role) => role.role === member.role,
                          )?.label ?? 'Desconocido'}
                        </Badge>
                        {member.role === 'owner' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-60 hover:opacity-100"
                          >
                            <UserCog2 size={16} />
                            <span className="sr-only">Configurar miembro</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Fragment>
  )
}
