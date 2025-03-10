import { CircleAlertIcon } from 'lucide-react'

export function AccessDenied() {
  return (
    <div className="rounded-md border px-4 py-3">
      <div className="flex gap-3">
        <CircleAlertIcon
          className="mt-0.5 shrink-0 text-red-500"
          size={16}
          aria-hidden="true"
        />
        <div className="grow space-y-1">
          <p className="font-medium text-sm">Acceso denegado</p>
          <ul className="list-inside list-disc text-muted-foreground text-sm">
            <li>No tienes permisos para acceder a esta página.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
