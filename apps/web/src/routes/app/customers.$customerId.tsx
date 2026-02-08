import { api } from '@cetus/api-client'
import { Avatar, AvatarFallback } from '@cetus/ui/avatar'
import { Button } from '@cetus/ui/button'
import { Separator } from '@cetus/ui/separator'
import { DefaultLoader } from '@cetus/web/components/default-loader'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { CustomerMetricsCards } from '@cetus/web/features/customers/components/customer-metrics-cards'
import { CustomerOrdersSection } from '@cetus/web/features/customers/components/customer-orders-section'
import {
  ArrowLeft01Icon,
  Calendar03Icon,
  Call02Icon,
  Mail01Icon,
  PencilEdit02Icon,
  WhatsappIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/app/customers/$customerId')({
  loader: async ({ params, context }) => {
    const { customerId } = params

    const customer = await context.queryClient.ensureQueryData({
      queryKey: ['customers', customerId],
      queryFn: () => api.customers.getById(customerId),
    })

    await context.queryClient.ensureQueryData({
      queryKey: ['customers', customerId, 'orders', { page: 1, pageSize: 20 }],
      queryFn: () =>
        api.customers.listOrders({ customerId, page: 1, pageSize: 20 }),
    })

    return customer
  },
  component: RouteComponent,
  pendingComponent: () => (
    <div className="p-4 sm:p-6 lg:p-8">
      <DefaultLoader />
    </div>
  ),
})

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function RouteComponent() {
  const { customerId } = Route.useParams()
  const { data: customer } = useSuspenseQuery({
    queryKey: ['customers', customerId],
    queryFn: () => api.customers.getById(customerId),
  })

  return (
    <div>
      <div className="px-4 pb-4 sm:px-6 lg:px-8">
        <div className="sticky top-0 z-10 space-y-4 bg-background py-4">
          <Button asChild size="xs" variant="ghost">
            <Link to="/app/customers">
              <HugeiconsIcon icon={ArrowLeft01Icon} />
              Volver
            </Link>
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback className="bg-primary/10 font-medium text-primary text-sm">
                  {getInitials(customer.name)}
                </AvatarFallback>
              </Avatar>

              <h1 className="font-bold text-2xl tracking-tight">
                {customer.name}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {customer.phone && (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`https://wa.me/57${customer.phone.replace(/\D/g, '')}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <HugeiconsIcon icon={WhatsappIcon} />
                    WhatsApp
                  </a>
                </Button>
              )}

              {customer.phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${customer.phone}`}>
                    <HugeiconsIcon icon={Call02Icon} />
                    Llamar
                  </a>
                </Button>
              )}

              {customer.email && (
                <Button asChild size="sm" variant="outline">
                  <a href={`mailto:${customer.email}`}>
                    <HugeiconsIcon icon={Mail01Icon} />
                    Email
                  </a>
                </Button>
              )}

              <Button disabled size="sm" variant="outline">
                <HugeiconsIcon icon={PencilEdit02Icon} />
                Editar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
            {customer.phone && (
              <span className="inline-flex items-center gap-1.5">
                <HugeiconsIcon
                  className="size-3.5 shrink-0"
                  icon={Call02Icon}
                />
                {customer.phone}
              </span>
            )}

            {customer.email && (
              <>
                <Separator className="hidden sm:block" orientation="vertical" />
                <span className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon
                    className="size-3.5 shrink-0"
                    icon={Mail01Icon}
                  />
                  {customer.email}
                </span>
              </>
            )}

            {customer.since && (
              <>
                <Separator className="hidden sm:block" orientation="vertical" />
                <span className="inline-flex items-center gap-1.5">
                  <HugeiconsIcon
                    className="size-3.5 shrink-0"
                    icon={Calendar03Icon}
                  />
                  Cliente desde{' '}
                  <FormattedDate date={new Date(customer.since)} />
                </span>
              </>
            )}
          </div>
        </div>

        <CustomerMetricsCards customer={customer} />

        <div className="mt-6">
          <CustomerOrdersSection customerId={customerId} />
        </div>
      </div>
    </div>
  )
}
