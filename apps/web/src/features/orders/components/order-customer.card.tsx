import type { OrderCustomer } from '@cetus/api-client/types/orders'
import { Card } from '@cetus/ui/card'
import { MailIcon, MapPinIcon, PhoneIcon, UserIcon } from 'lucide-react'

type Props = {
  customer: OrderCustomer
  address?: string
}

export function OrderCustomerCard({ customer, address }: Props) {
  return (
    <Card className="gap-2 p-4">
      <div className="flex items-center text-base">
        <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Información del cliente</h3>
      </div>

      <div className="space-y-2 text-sm">
        <p className="font-medium">{customer.name}</p>
        <div className="flex items-center text-muted-foreground text-sm">
          <MailIcon className="mr-2 h-4 w-4" />{' '}
          <a
            className="transition-colors hover:text-primary"
            href={`mailto:${customer.email}`}
          >
            {customer.email}
          </a>
        </div>
        <div className="flex items-center text-muted-foreground text-sm">
          <PhoneIcon className="mr-2 h-4 w-4" />
          <a
            className="transition-colors hover:text-primary"
            href={`tel:${customer.phone}`}
          >
            {customer.phone}
          </a>
        </div>

        {address && (
          <div className="flex items-center text-muted-foreground text-sm">
            <MapPinIcon className="mr-2 h-4 w-4" />
            <span>{address}</span>
          </div>
        )}
      </div>
    </Card>
  )
}
