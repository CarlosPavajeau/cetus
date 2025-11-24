import type {
  createCouponRuleSchema,
  createCouponSchema,
} from '@cetus/schemas/coupon.schema'
import { AddCouponRule } from '@cetus/web/features/coupons/components/add-coupon-rule'
import { CouponRule } from '@cetus/web/features/coupons/components/coupon-rule'
import { useFormContext } from 'react-hook-form'

type CreateCouponRule = typeof createCouponRuleSchema.infer
type CreateCoupon = typeof createCouponSchema.infer

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
            key={`rule-${index}-${rule.ruleType}-${rule.value}`}
            onRemove={() => removeRule(index)}
            rule={rule}
          />
        ))}
      </div>
    </div>
  )
}
