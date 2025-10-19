import { useNumberFormatter } from 'react-aria'
import { type Coupon, CouponDiscountType } from '@/api/coupons'
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
        <Currency currency="COP" value={Number(coupon.discountValue)} />
      </p>
    )
  }

  if (coupon.discountType === CouponDiscountType.FreeShipping) {
    return <p className="text-muted-foreground text-sm">Envío gratis</p>
  }
}
