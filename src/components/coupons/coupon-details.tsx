import {
    type Coupon,
    CouponDiscountType,
    CouponDiscountTypeText,
} from '@/api/coupons'
import { Currency } from '@/components/currency'
import { FormattedDate } from '@/components/formatted-date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/shared/cn'
import { CheckIcon, CopyIcon, EyeIcon } from 'lucide-react'
import { useState } from 'react'
import { useNumberFormatter } from 'react-aria'

type Props = {
  coupon: Coupon
}

export function CouponDetails({ coupon }: Props) {
  const [open, setOpen] = useState(false)

  const [copied, setCopied] = useState<boolean>(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = () => {
    if (!coupon.endDate) return false
    return new Date(coupon.endDate) < new Date()
  }

  const getStatusBadge = () => {
    if (!coupon.isActive) {
      return (
        <Badge variant="secondary" className="rounded">
          Inactivo
        </Badge>
      )
    }
    if (isExpired()) {
      return (
        <Badge variant="destructive" className="rounded">
          Expirado
        </Badge>
      )
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return (
        <Badge variant="destructive" className="rounded">
          Límite alcanzado
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="rounded">
        Activo
      </Badge>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <EyeIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Detalles del cupón</SheetTitle>
          <SheetDescription>{getStatusBadge()}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="line-clamp-1 font-medium text-sm">Código</h3>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={copied ? 'Copiado' : 'Copiar al portapapeles'}
                disabled={copied}
                className="disabled:opacity-100"
              >
                <div
                  className={cn(
                    'transition-all',
                    copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                  )}
                >
                  <CheckIcon
                    className="text-success-base"
                    size={16}
                    aria-hidden="true"
                  />
                </div>
                <div
                  className={cn(
                    'absolute transition-all',
                    copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
                  )}
                >
                  <CopyIcon size={16} aria-hidden="true" />
                </div>
              </Button>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center font-mono font-semibold text-lg">
              {coupon.code}
            </div>
          </div>
          <div>
            <h3 className="line-clamp-1 font-medium text-sm">
              Tipo de descuento
            </h3>
            <p className="text-muted-foreground text-sm">
              {CouponDiscountTypeText[coupon.discountType]}
            </p>
          </div>
          <div>
            <h3 className="line-clamp-1 font-medium text-sm">
              Valor del descuento
            </h3>
            <CouponDiscountValue coupon={coupon} />
          </div>
          {coupon.description && (
            <div>
              <h3 className="line-clamp-1 font-medium text-sm">Descripción</h3>
              <p className="text-muted-foreground text-sm">
                {coupon.description}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="line-clamp-1 font-medium text-sm">Límite de uso</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usados</span>
                <span>
                  {coupon.usageCount}
                  {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                </span>
              </div>
            </div>
          </div>

          {(coupon.startDate || coupon.endDate) && (
            <div className="space-y-3">
              <h3 className="line-clamp-1 font-medium text-sm">
                Periodo de validez
              </h3>

              <div className="space-y-2">
                {coupon.startDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Fecha de inicio
                    </span>
                    <FormattedDate date={new Date(coupon.startDate)} />
                  </div>
                )}
                {coupon.endDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fecha de fin</span>
                    <FormattedDate date={new Date(coupon.endDate)} />
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator className="my-2" />

          <div className="space-y-3">
            <h2 className="font-semibold text-foreground">Reglas</h2>

            <div className="space-y-2">
              <Badge variant="outline" className="rounded">
                En construcción
              </Badge>
            </div>
          </div>
        </div>

        <SheetFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function CouponDiscountValue({ coupon }: Props) {
  const percentageFormatter = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  if (coupon.discountType === CouponDiscountType.Percentage) {
    return (
      <p className="text-muted-foreground text-sm">
        {percentageFormatter.format(coupon.discountValue / 100)}
      </p>
    )
  }

  if (coupon.discountType === CouponDiscountType.FixedAmount) {
    return (
      <p className="text-muted-foreground text-sm">
        <Currency value={Number(coupon.discountValue)} currency="COP" />
      </p>
    )
  }

  if (coupon.discountType === CouponDiscountType.FreeShipping) {
    return <p className="text-muted-foreground text-sm">Envío gratis</p>
  }
}
