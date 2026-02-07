import { authClient } from '@cetus/auth/client'
import { Alert, AlertTitle } from '@cetus/ui/alert'
import { Badge } from '@cetus/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@cetus/ui/item'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@cetus/ui/tabs'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { MembersList } from '@cetus/web/features/auth/components/members-list'
import { ConfigureWompiCredentialsForm } from '@cetus/web/features/stores/components/configure-wompi-credentials-form'
import { ConnectToMercadoPagoButton } from '@cetus/web/features/stores/components/connect-to-mercado-pago-button'
import { CustomDomainSection } from '@cetus/web/features/stores/components/custom-domain-section'
import { EditStoreForm } from '@cetus/web/features/stores/components/edit-store-form'
import { useTenantStore } from '@cetus/web/store/use-tenant-store'
import { createFileRoute } from '@tanstack/react-router'
import {
  CheckIcon,
  CreditCardIcon,
  GlobeIcon,
  StoreIcon,
  UsersIcon,
} from 'lucide-react'

export const Route = createFileRoute('/app/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: session, isPending } = authClient.useSession()
  const { data: organization, isPending: isOrgPending } =
    authClient.useActiveOrganization()
  const { store } = useTenantStore()
  const isConnectedToMercadoPago = store?.isConnectedToMercadoPago ?? false

  if (isPending || isOrgPending) {
    return (
      <div className="p-4">
        <DefaultLoader />
      </div>
    )
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
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-semibold text-2xl">Configuración</h1>
        <p className="text-muted-foreground text-sm">
          Administra la configuración de tu tienda y cuenta.
        </p>
      </div>

      <div className="w-full">
        <Tabs defaultValue="general">
          <TabsList variant="line">
            <TabsTrigger value="general">
              <StoreIcon />
              General
            </TabsTrigger>
            <TabsTrigger value="domain">
              <GlobeIcon />
              Dominio
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCardIcon />
              Pagos
            </TabsTrigger>
            <TabsTrigger value="team">
              <UsersIcon />
              Equipo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Información de la tienda</CardTitle>
                <CardDescription>
                  Actualiza los datos generales de tu tienda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EditStoreForm />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domain">
            <Card>
              <CardHeader>
                <CardTitle>Dominio personalizado</CardTitle>
                <CardDescription>
                  Conecta un dominio propio a tu tienda.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomDomainSection />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <div className="flex flex-col gap-4">
              <Item variant="outline">
                <ItemContent>
                  <ItemTitle>
                    Mercado Pago
                    {isConnectedToMercadoPago && (
                      <Badge variant="outline">
                        <CheckIcon />
                        Conectado
                      </Badge>
                    )}
                  </ItemTitle>
                  <ItemDescription>
                    Configura tus credenciales de Mercado Pago para recibir
                    pagos en tu aplicación.
                  </ItemDescription>
                </ItemContent>

                {!isConnectedToMercadoPago && (
                  <ItemActions>
                    <ConnectToMercadoPagoButton />
                  </ItemActions>
                )}
              </Item>

              <Card>
                <CardHeader>
                  <CardTitle>Wompi</CardTitle>
                  <CardDescription>
                    Configura tus credenciales de Wompi para recibir pagos en tu
                    aplicación.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConfigureWompiCredentialsForm />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Miembros</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <MembersList
                  isAdmin={isAdmin}
                  isOwner={isOwner}
                  members={organization.members}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
