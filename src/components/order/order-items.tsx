import { Currency } from '@/components/currency'
import { Image } from '@/components/image'
import { Button } from '@/components/ui/button'
import { getImageUrl } from '@/shared/cdn'
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
}: Props) {
  return (
    <div className="space-y-6 rounded-md border bg-card p-6">
      <h2 className="font-medium text-lg">{title}</h2>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id || item.productId} className='rounded-md border p-4'>
            <div className="flex gap-4">
              <div className="relative h-24 w-24 rounded-md">
                <Image
                  src={getImageUrl(item.imageUrl || 'placeholder.svg')}
                  alt={item.productName}
                  layout="fill"
                  className="rounded-md object-cover"
                />
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <h3 className="font-medium">{item.productName}</h3>

                  {editable && onRemove && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive/80"
                      type="button"
                      onClick={() => onRemove(item.id || item.productId || '')}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {editable && onQuantityChange ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        type="button"
                        onClick={() =>
                          onQuantityChange(
                            item.id || item.productId || '',
                            item.quantity - 1,
                          )
                        }
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        type="button"
                        onClick={() =>
                          onQuantityChange(
                            item.id || item.productId || '',
                            item.quantity + 1,
                          )
                        }
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Currency value={item.price} currency="COP" /> x{' '}
                      {item.quantity}
                    </div>
                  )}
                  <div className="ml-auto font-medium">
                    <Currency
                      value={item.price * item.quantity}
                      currency="COP"
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
