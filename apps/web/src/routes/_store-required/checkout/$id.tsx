import { useMutation } from '@tanstack/react-query'
import { createFileRoute, notFound } from '@tanstack/react-router'
import {
  BanknoteIcon,
  CreditCardIcon,
  PackageIcon,
  ShieldCheckIcon,
  Smartphone,
} from 'lucide-react'
import { createOrderPayment, fetchOrder } from '@/api/orders'
import { RedeemCoupon } from '@/components/coupons/redeem-coupon'
import { Currency } from '@/components/currency'
import { DefaultPageLayout } from '@/components/default-page-layout'
import { BancolombiaLogo, PSELogo } from '@/components/icons'
import { OrderItemView } from '@/components/order/order-item-view'
import { BancolombiaPayment } from '@/components/payment/bancolombia-payment'
import { CardPaymentForm } from '@/components/payment/card-payment-form'
import { NequiPaymentForm } from '@/components/payment/nequi-payment-form'
import { PsePaymentForm } from '@/components/payment/pse-payment-form'
import { SubmitButton } from '@/components/submit-button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_store-required/checkout/$id')({
  loader: async ({ params }) => {
    const { id } = params
    const order = await fetchOrder(id)

    if (!order) {
      throw notFound()
    }

    return { order }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { order } = Route.useLoaderData()

  const { mutate, isPending } = useMutation({
    mutationKey: ['orders', 'payment', 'create'],
    mutationFn: createOrderPayment,
    onSuccess: (paymentUrl) => {
      window.location.href = paymentUrl
    },
  })

  const handlePayment = () => {
    mutate(order.id)
  }

  return (
    <DefaultPageLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary"># {order.orderNumber}</Badge>
            <Badge variant="secondary">
              <ShieldCheckIcon />
              Pago seguro
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="ml-auto">Paso 2 de 2</Badge>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="col-span-2 lg:col-span-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CreditCardIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Método de pago</CardTitle>
                    <CardDescription>
                      Seleccione su método de pago
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Accordion
                  className="w-full"
                  collapsible
                  type="single"
                  variant="outline"
                >
                  <AccordionItem value="card">
                    <AccordionTrigger>
                      <Item className="p-0">
                        <ItemMedia variant="icon">
                          <CreditCardIcon />
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
                      <CardPaymentForm order={order} />
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
                      <BancolombiaPayment order={order} />
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
                      <PsePaymentForm order={order} />
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
                          <ItemDescription>
                            Paga con tu cuenta Nequi
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    </AccordionTrigger>
                    <AccordionContent>
                      <NequiPaymentForm order={order} />
                    </AccordionContent>
                  </AccordionItem>

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
                      <SubmitButton
                        disabled={isPending}
                        isSubmitting={isPending}
                        onClick={handlePayment}
                        type="button"
                      >
                        Ir a Mercado Pago
                      </SubmitButton>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <PackageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Resumen de la orden</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ItemGroup className="gap-2">
                  {order.items.map((item) => (
                    <OrderItemView item={item} key={`${item.id}`} />
                  ))}
                </ItemGroup>

                <Separator />

                <RedeemCoupon order={order} />

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      <Currency currency="COP" value={order.subtotal} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envío</span>
                    <span className="font-medium">
                      <Currency currency="COP" value={order.deliveryFee ?? 0} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="font-medium">
                      <Currency currency="COP" value={order.discount ?? 0} />
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>
                    <Currency currency="COP" value={order.total} />
                  </span>
                </div>
              </CardContent>

              <CardFooter>
                <small className="text-muted-foreground text-xs">
                  Recuerda que el costo del envío es cancelado al momento de la
                  entrega de los productos.
                </small>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
