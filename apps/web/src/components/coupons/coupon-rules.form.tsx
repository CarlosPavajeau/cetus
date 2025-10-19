import { useFormContext } from 'react-hook-form'
import { AddCouponRule } from '@/components/coupons/add-coupon-rule'
import { CouponRule } from '@/components/coupons/coupon-rule'
import type { CreateCoupon, CreateCouponRule } from '@/schemas/coupons'

export function CouponRulesForm() {
  const form = useFormContext<CreateCoupon>()
  const rules = form.watch('rules')

  const addRule = (rule: CreateCouponRule) => {
    form.setValue('rules', [...rules, rule])
  }

  const removeRule = (index: number) => {
    form.setValue(
      'rules',
      rules.filter((_, i) => i !== index),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-lg">Reglas</h2>

        <AddCouponRule onSuccess={addRule} />
      </div>

      <div className="flex flex-col gap-2">
        {rules.map((rule, index) => (
          <CouponRule
            key={index}
            onRemove={() => removeRule(index)}
            rule={rule}
          />
        ))}
      </div>
    </div>
  )
}
