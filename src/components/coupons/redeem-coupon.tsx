import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function RedeemCoupon() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-medium text-sm">Cupón de descuento</h3>
          <p className="text-muted-foreground text-xs">
            Ingresa un código para obtener descuentos
          </p>
        </div>
      </div>
      <div>
        <Input placeholder="Código del cupón" />
      </div>
      <div>
        <Button variant="outline" size="sm">
          Aplicar
        </Button>
      </div>
    </div>
  )
}
