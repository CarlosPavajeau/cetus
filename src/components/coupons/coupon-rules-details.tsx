import { CouponRule } from '@/components/coupons/coupon-rule'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useCouponRules } from '@/hooks/coupons'
import { InfoIcon } from 'lucide-react'

type Props = {
  couponId: number
}

export function CouponRulesDetails({ couponId }: Readonly<Props>) {
  const { couponRules, isLoading, error } = useCouponRules(couponId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Error al cargar las reglas del cupón
        </AlertDescription>
      </Alert>
    )
  }

  if (couponRules?.length === 0) {
    return (
      <Alert>
        <InfoIcon className="size-4" />
        <AlertTitle>No hay reglas</AlertTitle>
        <AlertDescription>Este cupón no tiene reglas.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {couponRules?.map((rule) => (
        <CouponRule key={rule.id} rule={rule} />
      ))}
    </div>
  )
}
