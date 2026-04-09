export function DetailRow({
  label,
  value,
  subvalue,
}: {
  label: string
  value: string
  subvalue?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="text-sm font-medium">{value}</dd>
        {subvalue && (
          <dd className="text-xs text-muted-foreground">{subvalue}</dd>
        )}
      </div>
    </div>
  )
}
