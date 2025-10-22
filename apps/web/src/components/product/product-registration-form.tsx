import { AdvancedProductRegistrationForm } from '@/components/product/advanced-product-registration-form'
import { SimpleProductRegistrationForm } from '@/components/product/simple-product-registration-form'

type Props = {
  mode: 'advanced' | 'simple'
  onBack: () => void
}

export function ProductRegistrationForm({ mode, onBack }: Readonly<Props>) {
  if (mode === 'simple') {
    return <SimpleProductRegistrationForm onBack={onBack} />
  }

  return <AdvancedProductRegistrationForm onBack={onBack} />
}
