import { SimpleProductRegistrationForm } from '@/components/product/simple-product-registration-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeftIcon } from 'lucide-react'
import { useState } from 'react'

type Props = {
  mode: 'advanced' | 'simple'
  onBack: () => void
}

export function ProductRegistrationForm({ mode, onBack }: Props) {
  const [step, setStep] = useState(1)

  const totalSteps = mode === 'advanced' ? 4 : 1

  if (mode === 'simple') {
    return <SimpleProductRegistrationForm onBack={onBack} />
  }

  return (
    <div>
      <div className="mx-auto max-w-7xl">
        <div className="space-y-2">
          <Button onClick={onBack} size="sm" variant="ghost">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="mb-8 flex items-center gap-4">
            <div>
              <h1 className="font-bold font-heading text-3xl text-foreground">
                {mode === 'advanced'
                  ? 'Registro de Producto Avanzado'
                  : 'Registro de Producto Simple'}
              </h1>
              <p className="text-muted-foreground">
                {mode === 'advanced'
                  ? 'Crea un producto con múltiples variantes y opciones'
                  : 'Configuración rápida del producto con información básica'}
              </p>
            </div>
            <Badge className="ml-auto" variant="secondary">
              Paso {step} de {totalSteps}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
