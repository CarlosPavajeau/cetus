import {
  CreditCardIcon,
  CustomerService01Icon,
  DeliveryTruck01Icon,
  SecurityCheckIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

const trustBadges = [
  {
    icon: DeliveryTruck01Icon,
    title: 'Envío Rápido',
    description: 'Entrega en 24-48 horas',
  },
  {
    icon: SecurityCheckIcon,
    title: 'Compra Segura',
    description: 'Protección al comprador',
  },
  {
    icon: CreditCardIcon,
    title: 'Pago Fácil',
    description: 'Múltiples métodos de pago',
  },
  {
    icon: CustomerService01Icon,
    title: 'Soporte 24/7',
    description: 'Estamos para ayudarte',
  },
]

export function TrustBadgesSection() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      {trustBadges.map((badge) => (
        <div
          className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-card p-4 text-center"
          key={badge.title}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon className="h-6 w-6" icon={badge.icon} />
          </div>
          <div>
            <h4 className="font-medium text-sm">{badge.title}</h4>
            <p className="text-muted-foreground text-xs">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
