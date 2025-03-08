import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

export function NewOrdersSummary() {
  return (
    <Card className="gap-5">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <CardTitle>Nuevas ordenes</CardTitle>
            <div className="flex items-start gap-2">
              <div className="font-semibold text-2xl">26,864</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-amber-500"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Pendiente
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-emerald-500"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Pagada
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-emerald-700"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Enviada
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-xs bg-destructive"
              ></div>
              <div className="text-[13px]/3 text-muted-foreground/50">
                Cancelada
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex h-5 gap-1">
          <div className="h-full bg-amber-500" style={{ width: '22%' }}></div>
          <div className="h-full bg-emerald-500" style={{ width: '24%' }}></div>
          <div className="h-full bg-emerald-700" style={{ width: '16%' }}></div>
          <div className="h-full bg-destructive" style={{ width: '38%' }}></div>
        </div>

        <div>
          <div className="mb-3 text-[13px]/3 text-muted-foreground/50">
            Nuevas ordenes
          </div>
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-amber-500"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Pendiente</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                4,279
              </span>
            </li>
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-emerald-500"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Pagada</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                4,827
              </span>
            </li>
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-emerald-700"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Enviada</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                3,556
              </span>
            </li>
            <li className="flex items-center gap-2 py-2">
              <span
                className="size-2 shrink-0 rounded-full bg-destructive"
                aria-hidden="true"
              ></span>
              <span className="grow text-muted-foreground">Cancelada</span>
              <span className="font-medium text-[13px]/3 text-foreground/70">
                6,987
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
