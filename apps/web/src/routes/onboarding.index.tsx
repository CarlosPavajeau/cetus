import { api } from '@cetus/api-client'
import { Button, buttonVariants } from '@cetus/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import { OnBoardingForm } from '@cetus/web/components/forms/onboarding'
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from '@cetus/web/components/reui/stepper'
import { getSession } from '@cetus/web/functions/get-session'
import { cn } from '@cetus/web/shared/utils'
import { Loading02Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { setupApiClient } from '../lib/api/setup'

export const Route = createFileRoute('/onboarding/')({
  beforeLoad: async () => {
    const session = await getSession()

    if (!session) {
      throw redirect({
        to: '/sign-in',
      })
    }
  },
  loader: async () => {
    setupApiClient()

    const mercadoPagoUrl = await api.stores.getMercadoPagoAuthorizationUrl()
    return { mercadoPagoUrl }
  },
  component: RouteComponent,
  staleTime: 60 * 1000, // 1 minute
})

const ONBOARDING_STEPS = [
  { id: 1, label: 'Tu tienda' },
  { id: 2, label: 'Medios de pago' },
]

function RouteComponent() {
  const { mercadoPagoUrl } = Route.useLoaderData()
  const [currentStep, setCurrentStep] = useState(2)

  const handleCompleteStep = () => {
    setCurrentStep(currentStep + 1)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-border border-b bg-background/75 backdrop-blur-xl">
        <nav
          aria-label="Navegacion principal"
          className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        >
          <Link
            className="inline-flex items-center gap-2 font-semibold text-foreground text-sm tracking-tight"
            resetScroll
            to="/"
          >
            <span className="inline-flex size-6 items-center justify-center rounded-md border border-border bg-accent text-xs">
              C
            </span>
            Cetus
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <div className="grid gap-4">
          <Stepper
            className="w-full space-y-8"
            defaultValue={currentStep}
            indicators={{
              completed: (
                <HugeiconsIcon
                  className="size-3.5"
                  icon={Tick02Icon}
                  strokeWidth={2}
                />
              ),
              loading: (
                <HugeiconsIcon
                  className="size-3.5 animate-spin"
                  icon={Loading02Icon}
                  strokeWidth={2}
                />
              ),
            }}
            onValueChange={setCurrentStep}
          >
            <StepperNav>
              {ONBOARDING_STEPS.map((step) => (
                <StepperItem key={step.id} step={step.id}>
                  <StepperTrigger asChild>
                    <StepperIndicator className="data-[state=active]:bg-primary data-[state=completed]:bg-green-500 data-[state=active]:text-primary-foreground data-[state=completed]:text-white data-[state=inactive]:text-gray-500">
                      {step.id}
                    </StepperIndicator>
                  </StepperTrigger>
                  {ONBOARDING_STEPS.length > step.id && (
                    <StepperSeparator className="group-data-[state=completed]/step:bg-green-500" />
                  )}
                </StepperItem>
              ))}
            </StepperNav>

            <StepperPanel>
              <StepperContent value={1}>
                <Card>
                  <CardHeader>
                    <CardTitle>Crea tu tienda</CardTitle>
                    <CardDescription>
                      Elige el nombre y la URL de tu tienda. Luego conectarás tu
                      cuenta de Mercado Pago.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <OnBoardingForm onSuccess={handleCompleteStep} />
                  </CardContent>
                </Card>
              </StepperContent>

              <StepperContent value={2}>
                <Card>
                  <CardHeader>
                    <CardTitle>Vincular MercadoPago</CardTitle>
                    <CardDescription>
                      Vincula tu cuenta de Mercado Pago para aceptar pagos en tu
                      tienda.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="grid gap-2">
                      {mercadoPagoUrl && (
                        <a
                          className={cn(
                            buttonVariants({ size: 'lg' }),
                            'w-full',
                          )}
                          href={mercadoPagoUrl}
                          rel="noopener noreferrer"
                          target="_self"
                        >
                          Vincular cuenta
                        </a>
                      )}

                      <Button
                        asChild
                        className="w-full"
                        size="lg"
                        variant="ghost"
                      >
                        <Link to="/app/products/new">Configurar despúes</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </StepperContent>
            </StepperPanel>
          </Stepper>
        </div>
      </main>
    </div>
  )
}
