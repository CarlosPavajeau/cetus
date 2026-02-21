export function SecuritySection() {
  return (
    <section className="border-border border-b py-10">
      <div className="rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
              Seguridad y estabilidad
            </p>
            <h3 className="mt-2 font-semibold text-foreground text-xl tracking-tight">
              Infraestructura confiable para operar todos tus canales
            </h3>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
              Protegemos operaciones, conversaciones y datos de ventas con una
              arquitectura preparada para escalar sin sacrificar rendimiento.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border bg-accent p-3">
            <p className="text-muted-foreground text-xs">Disponibilidad</p>
            <p className="mt-1 font-semibold text-base text-foreground">
              99.9%
            </p>
          </div>
          <div className="rounded-md border border-border bg-accent p-3">
            <p className="text-muted-foreground text-xs">Backups</p>
            <p className="mt-1 font-semibold text-base text-foreground">
              Diarios automaticos
            </p>
          </div>
          <div className="rounded-md border border-border bg-accent p-3">
            <p className="text-muted-foreground text-xs">Cifrado</p>
            <p className="mt-1 font-semibold text-base text-foreground">
              En transito y en reposo
            </p>
          </div>
          <div className="rounded-md border border-border bg-accent p-3">
            <p className="text-muted-foreground text-xs">Monitoreo</p>
            <p className="mt-1 font-semibold text-base text-foreground">
              Alertas 24/7
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
