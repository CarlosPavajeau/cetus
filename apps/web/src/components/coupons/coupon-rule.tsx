import { TrashIcon } from 'lucide-react'
import { CouponRuleType, CouponRuleTypeText } from '@/api/coupons'
import { Currency } from '@/components/currency'
import { useCategories } from '@/hooks/categories'
import { useProducts } from '@/hooks/products'
import type { CreateCouponRule } from '@/schemas/coupons'

type Props = {
  rule: CreateCouponRule
  onRemove?: () => void
}

export function CouponRule({ rule, onRemove }: Readonly<Props>) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex p-3">
        <div className="flex flex-1 flex-col">
          <div className="flex justify-between">
            <h3 className="line-clamp-1 font-medium text-sm">
              {CouponRuleTypeText[rule.ruleType]}
            </h3>
            {onRemove && (
              <button
                className="text-muted-foreground hover:text-red-500"
                onClick={onRemove}
                type="button"
              >
                <TrashIcon className="size-4" />
              </button>
            )}
          </div>
          <CouponRuleValue rule={rule} />
        </div>
      </div>
    </div>
  )
}

type CouponRuleValueProps = {
  rule: CreateCouponRule
}

function CouponRuleValue({ rule }: Readonly<CouponRuleValueProps>) {
  if (rule.ruleType === CouponRuleType.MinPurchaseAmount) {
    return (
      <span className="mt-1 font-medium text-xs">
        <Currency currency="COP" value={Number(rule.value)} />
      </span>
    )
  }

  if (rule.ruleType === CouponRuleType.SpecificCategory) {
    return <CouponRuleValueSpecificCategory rule={rule} />
  }

  if (rule.ruleType === CouponRuleType.SpecificProduct) {
    return <CouponRuleValueSpecificProduct rule={rule} />
  }

  return null
}

type CouponRuleValueSpecificCategoryProps = {
  rule: CreateCouponRule
}

function CouponRuleValueSpecificCategory({
  rule,
}: Readonly<CouponRuleValueSpecificCategoryProps>) {
  const { categories } = useCategories()

  if (!categories) {
    return null
  }

  const category = categories.find((c) => c.id === rule.value)

  if (!category) {
    return null
  }

  return <span className="mt-1 font-medium text-xs">{category?.name}</span>
}

type CouponRuleValueSpecificProductProps = {
  rule: CreateCouponRule
}

function CouponRuleValueSpecificProduct({
  rule,
}: Readonly<CouponRuleValueSpecificProductProps>) {
  const { products } = useProducts()

  if (!products) {
    return null
  }

  const product = products.find((p) => p.id === rule.value)

  if (!product) {
    return null
  }

  return <span className="mt-1 font-medium text-xs">{product?.name}</span>
}
