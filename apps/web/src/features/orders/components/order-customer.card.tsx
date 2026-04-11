import type { OrderCustomer } from '@cetus/api-client/types/orders'
import { Card } from '@cetus/ui/card'
import { Button } from '@cetus/web/components/ui/button'
import { WhatsappIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { MailIcon, MapPinIcon, PhoneIcon, UserIcon } from 'lucide-react'

type Props = {
  customer: OrderCustomer
  address?: string
}

export function OrderCustomerCard({ customer, address }: Props) {
  return (
    <Card className="gap-2 p-4">
      <div className="flex items-center text-base">
        <h3 className="font-heading font-medium">
          {customer.name}
        </h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center text-muted-foreground text-sm">
          <MailIcon className="mr-2 size-4 shrink-0" />
          <a
            className="truncate transition-colors hover:text-primary"
            href={`mailto:${customer.email}`}
          >
            {customer.email}
          </a>
        </div>
        <div className="flex items-center text-muted-foreground text-sm">
          <PhoneIcon className="mr-2 size-4 shrink-0" />
          <a
            className="transition-colors hover:text-primary"
            href={`tel:${customer.phone}`}
          >
            {customer.phone}
          </a>
        </div>

        {address ? (
          <div className="flex items-start text-muted-foreground text-sm">
            <MapPinIcon className="mr-2 mt-0.5 size-4 shrink-0" />
            <span>{address}</span>
          </div>
        ) : null}

        <Button asChild className="w-full">
          <a
            href={`https://wa.me/${customer.phone}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <HugeiconsIcon className="size-3.5" icon={WhatsappIcon} />
            Contactar por WhatsApp
          </a>
        </Button>
      </div>
    </Card>
  )
}
