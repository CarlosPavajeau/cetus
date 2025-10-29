import { useNumberFormatter } from 'react-aria'
import type { Coupon } from '@/api/coupons'
import { Currency } from '@/components/currency'

type Props = {
  coupon: Coupon
}

export function CouponDiscountValue({ coupon }: Readonly<Props>) {
  const percentageFormatter = useNumberFormatter({
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })

  if (coupon.discountType === 'percentage') {
    return (
      <p className="text-muted-foreground text-sm">
        {percentageFormatter.format(coupon.discountValue / 100)}
      </p>
    )
  }

  if (coupon.discountType === 'fixed_amount') {
    return (
      <p className="text-muted-foreground text-sm">
        <Currency currency="COP" value={Number(coupon.discountValue)} />
      </p>
    )
  }

  if (coupon.discountType === 'free_shipping') {
    return <p className="text-muted-foreground text-sm">Envío gratis</p>
  }
}
