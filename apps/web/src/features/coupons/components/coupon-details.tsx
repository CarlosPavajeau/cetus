import type { Coupon } from '@cetus/api-client/types/coupons'
import { couponDiscountTypeLabels } from '@cetus/shared/constants/coupon'
import { Badge } from '@cetus/ui/badge'
import { Button } from '@cetus/ui/button'
import { Progress } from '@cetus/ui/progress'
import { Separator } from '@cetus/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@cetus/ui/sheet'
import { FormattedDate } from '@cetus/web/components/formatted-date'
import { CouponDiscountValue } from '@cetus/web/features/coupons/components/coupon-discount-value'
import { CouponRulesDetails } from '@cetus/web/features/coupons/components/coupon-rules-details'
import { cn } from '@cetus/web/shared/utils'
import { CheckIcon, CopyIcon, EyeIcon } from 'lucide-react'
import { useState } from 'react'

type Props = {
  coupon: Coupon
}

export function CouponDetails({ coupon }: Readonly<Props>) {
  const [open, setOpen] = useState(false)

  const [copied, setCopied] = useState<boolean>(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = () => {
    if (!coupon.endDate) {
      return false
    }

    return new Date(coupon.endDate) < new Date()
  }

  const getStatusBadge = () => {
    if (!coupon.isActive) {
      return (
        <Badge className="rounded" variant="secondary">
          Inactivo
        </Badge>
      )
    }
    if (isExpired()) {
      return (
        <Badge className="rounded" variant="destructive">
          Expirado
        </Badge>
      )
    }
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return (
        <Badge className="rounded" variant="destructive">
          Límite alcanzado
        </Badge>
      )
    }
    return (
      <Badge className="rounded" variant="default">
        Activo
      </Badge>
    )
  }

  return (
    <Sheet onOpenChange={setOpen} open={open}>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost">
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
                aria-label={copied ? 'Copiado' : 'Copiar al portapapeles'}
                className="disabled:opacity-100"
                disabled={copied}
                onClick={handleCopy}
                size="icon"
                variant="outline"
              >
                <div
                  className={cn(
                    'transition-all',
                    copied ? 'scale-100 opacity-100' : 'scale-0 opacity-0',
                  )}
                >
                  <CheckIcon
                    aria-hidden="true"
                    className="text-success-base"
                    size={16}
                  />
                </div>
                <div
                  className={cn(
                    'absolute transition-all',
                    copied ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
                  )}
                >
                  <CopyIcon aria-hidden="true" size={16} />
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
              {couponDiscountTypeLabels[coupon.discountType]}
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

          <div className="space-y-1">
            <h3 className="line-clamp-1 font-medium text-sm">Límite de uso</h3>
            <div className="space-y-1.5">
              <div className="flex justify-between gap-1.5">
                <span className="text-muted-foreground text-sm">Usos</span>
                <span className="text-sm">
                  {coupon.usageCount}
                  {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                </span>
              </div>
              {coupon.usageLimit && (
                <Progress
                  value={(coupon.usageCount / coupon.usageLimit) * 100 || 0}
                />
              )}
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

            <CouponRulesDetails couponId={coupon.id} />
          </div>
        </div>

        <SheetFooter className="flex justify-end gap-2">
          <Button onClick={() => setOpen(false)} variant="outline">
            Cerrar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
