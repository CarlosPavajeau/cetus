import { Skeleton } from '@cetus/ui/skeleton'
import { Fragment } from 'react/jsx-runtime'

export function AccountSkeleton() {
  return (
    <Fragment>
      <h1 className="mb-4 font-heading font-semibold text-2xl">
        Configuración de la cuenta
      </h1>
      <div className="flex flex-col gap-2">
        <h2 className="font-heading font-semibold text-lg">Datos personales</h2>
        <Skeleton className="h-32 w-full" />
        <h2 className="font-heading font-semibold text-lg">Tienda</h2>
        <Skeleton className="h-32 w-full" />
      </div>
    </Fragment>
  )
}
