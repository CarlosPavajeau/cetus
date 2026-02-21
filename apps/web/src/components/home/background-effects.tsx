export function BackgroundEffects() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-x-0 top-0 h-120 bg-[radial-gradient(55%_55%_at_50%_0%,rgba(15,23,42,0.14),rgba(255,255,255,0))] dark:bg-[radial-gradient(55%_55%_at_50%_0%,rgba(255,255,255,0.16),rgba(10,10,10,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(2,6,23,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,6,23,0.04)_1px,transparent_1px)] bg-size-[56px_56px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
    </div>
  )
}
