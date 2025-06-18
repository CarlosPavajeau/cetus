import { CouponRuleTypeText, type CreateCouponRule } from '@/api/coupons'
import { AddCouponRule } from '@/components/coupons/add-coupon-rule'
import { Button } from '@/components/ui/button'
import type { createCouponSchema } from '@/schemas/coupons'
import { TrashIcon } from 'lucide-react'
import { useFormContext } from 'react-hook-form'
import type { TypeOf } from 'zod'

export function CouponRulesForm() {
  const form = useFormContext<TypeOf<typeof createCouponSchema>>()
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
          <div key={index} className="flex items-center justify-between">
            <p>{CouponRuleTypeText[rule.ruleType]}</p>
            <p>{rule.value}</p>
            <Button
              variant="outline"
              size="icon"
              onClick={() => removeRule(index)}
            >
              <TrashIcon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
