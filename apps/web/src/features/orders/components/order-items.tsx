import { getImageUrl } from '@cetus/shared/utils/image'
import { Button } from '@cetus/ui/button'
import { Currency } from '@cetus/web/components/currency'
import { Image } from '@unpic/react'
import { Trash2Icon } from 'lucide-react'

type OrderItem = {
  id?: string
  productId?: string
  productName: string
  imageUrl?: string
  price: number
  quantity: number
}

type Props = {
  items: OrderItem[]
  title?: string
  editable?: boolean
  onRemove?: (itemId: string) => void
  onQuantityChange?: (itemId: string, newQuantity: number) => void
}

export function OrderItems({
  items,
  title = 'Productos en tu pedido',
  editable = false,
  onRemove,
  onQuantityChange,
}: Readonly<Props>) {
  return (
    <div className="space-y-6 rounded-md border bg-card p-6">
      <h2 className="font-medium text-lg">{title}</h2>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            className="rounded-md border p-4"
            key={item.id || item.productId}
          >
            <div className="flex gap-4">
              <div className="relative h-24 w-24 rounded-md">
                <Image
                  alt={item.productName}
                  className="rounded-sm object-cover"
                  height={64}
                  layout="constrained"
                  priority
                  src={getImageUrl(item.imageUrl || 'placeholder.svg')}
                  width={64}
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <h3 className="font-medium">{item.productName}</h3>

                  {editable && onRemove && (
                    <Button
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => onRemove(item.id || item.productId || '')}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {editable && onQuantityChange ? (
                    <div className="flex items-center gap-2">
                      <Button
                        className="h-8 w-8"
                        onClick={() =>
                          onQuantityChange(
                            item.id || item.productId || '',
                            item.quantity - 1,
                          )
                        }
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        className="h-8 w-8"
                        onClick={() =>
                          onQuantityChange(
                            item.id || item.productId || '',
                            item.quantity + 1,
                          )
                        }
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Currency currency="COP" value={item.price} /> x{' '}
                      {item.quantity}
                    </div>
                  )}
                  <div className="ml-auto font-medium">
                    <Currency
                      currency="COP"
                      value={item.price * item.quantity}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="py-8 text-center">
            <h2 className="mb-2 font-medium text-xl">No hay productos</h2>
            <p className="text-muted-foreground">
              No hay productos para mostrar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
