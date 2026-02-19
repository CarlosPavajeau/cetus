import type { Order } from '@cetus/api-client/types/orders'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@cetus/ui/accordion'
import { Button } from '@cetus/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@cetus/ui/empty'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@cetus/ui/item'
import { BancolombiaLogo, PSELogo } from '@cetus/web/components/icons'
import { BancolombiaPayment } from '@cetus/web/features/payments/components/bancolombia-payment'
import { CardPaymentForm } from '@cetus/web/features/payments/components/card-payment-form'
import { MercadoPagoPayment } from '@cetus/web/features/payments/components/mercado-pago-payment'
import { NequiPaymentForm } from '@cetus/web/features/payments/components/nequi-payment-form'
import { PsePaymentForm } from '@cetus/web/features/payments/components/pse-payment-form'
import { CreditCardIcon, Store03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { BanknoteIcon, Smartphone } from 'lucide-react'

type PaymentMethodsProps = {
  order: Order
  publicKey?: string
  integritySecret?: string
  hasMercadoPago: boolean
}

export function PaymentMethods({
  order,
  publicKey,
  integritySecret,
  hasMercadoPago,
}: PaymentMethodsProps) {
  const emptyPaymentMethods = !(publicKey || hasMercadoPago || integritySecret)

  if (emptyPaymentMethods) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Store03Icon} />
          </EmptyMedia>
          <EmptyTitle>No hay métodos de pago disponibles</EmptyTitle>
          <EmptyDescription>
            Por favor, comuníquese con el administrador de la tienda para
            obtener más información.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link to="/">Volver al inicio</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Accordion className="w-full" collapsible type="single" variant="outline">
      {publicKey && integritySecret && (
        <>
          <AccordionItem value="card">
            <AccordionTrigger>
              <Item className="p-0">
                <ItemMedia variant="icon">
                  <HugeiconsIcon icon={CreditCardIcon} />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Tarjeta de Crédito o Débito</ItemTitle>
                  <ItemDescription>
                    Paga con tu tarjeta de crédito o débito
                  </ItemDescription>
                </ItemContent>
              </Item>
            </AccordionTrigger>

            <AccordionContent>
              <CardPaymentForm
                integritySecret={integritySecret}
                order={order}
                publicKey={publicKey}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bancolombia">
            <AccordionTrigger>
              <Item className="p-0">
                <ItemMedia variant="icon">
                  <BancolombiaLogo />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Botón Bancolombia</ItemTitle>
                  <ItemDescription>
                    Realiza el pago con tu cuenta de Bancolombia
                  </ItemDescription>
                </ItemContent>
              </Item>
            </AccordionTrigger>
            <AccordionContent>
              <BancolombiaPayment
                integritySecret={integritySecret}
                order={order}
                publicKey={publicKey}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pse">
            <AccordionTrigger>
              <Item className="p-0">
                <ItemMedia variant="icon">
                  <PSELogo />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>PSE</ItemTitle>
                  <ItemDescription>
                    Paga con cualquiera de tus cuentas bancarias
                  </ItemDescription>
                </ItemContent>
              </Item>
            </AccordionTrigger>
            <AccordionContent>
              <PsePaymentForm
                integritySecret={integritySecret}
                order={order}
                publicKey={publicKey}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="nequi">
            <AccordionTrigger>
              <Item className="p-0">
                <ItemMedia variant="icon">
                  <Smartphone className="text-[#CA0080]" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Nequi</ItemTitle>
                  <ItemDescription>Paga con tu cuenta Nequi</ItemDescription>
                </ItemContent>
              </Item>
            </AccordionTrigger>
            <AccordionContent>
              <NequiPaymentForm
                integritySecret={integritySecret}
                order={order}
                publicKey={publicKey}
              />
            </AccordionContent>
          </AccordionItem>
        </>
      )}

      {hasMercadoPago && (
        <AccordionItem value="mercado-pago">
          <AccordionTrigger>
            <Item className="p-0">
              <ItemMedia variant="icon">
                <BanknoteIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Mercado pago</ItemTitle>
                <ItemDescription>
                  Pago con el portal de Mercado Pago
                </ItemDescription>
              </ItemContent>
            </Item>
          </AccordionTrigger>
          <AccordionContent>
            <MercadoPagoPayment order={order} />
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  )
}
