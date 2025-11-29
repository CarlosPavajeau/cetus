import type { OrderCustomer } from '@cetus/api-client/types/orders'
import { Card, CardContent, CardHeader, CardTitle } from '@cetus/ui/card'
import { MailIcon, MapPinIcon, PhoneIcon, UserIcon } from 'lucide-react'

type Props = {
  customer: OrderCustomer
  address: string
}

export function OrderCustomerCard({ customer, address }: Props) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center text-base">
          <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          Detalles del cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-1">
          <p className="font-medium">{customer.name}</p>
          <div className="flex items-start text-muted-foreground text-sm">
            <MapPinIcon className="mt-0.5 mr-2 h-4 w-4 shrink-0" />
            <span>{address}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-center text-muted-foreground text-sm">
            <PhoneIcon className="mr-2 h-4 w-4" />
            <a
              className="transition-colors hover:text-primary"
              href={`tel:${customer.phone}`}
            >
              {customer.phone}
            </a>
          </div>
          <div className="flex items-center text-muted-foreground text-sm">
            <MailIcon className="mr-2 h-4 w-4" />
            <a
              className="transition-colors hover:text-primary"
              href={`mailto:${customer.email}`}
            >
              {customer.email}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
