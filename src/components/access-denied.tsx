export function AccessDenied() {
  return (
    <>
      <h1 className="font-bold font-heading text-2xl text-foreground">
        Acceso denegado
      </h1>
      <span className="text-muted-foreground text-sm">
        No tienes permisos para acceder a esta página.
      </span>
    </>
  )
}
