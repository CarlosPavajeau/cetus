import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export function ApplicationHome() {
  const transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 select-none opacity-70 contain-strict"
      >
        <div className="absolute left-[-20%] top-[-10%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.10)_0,hsla(0,0%,55%,.04)_50%,hsla(0,0%,45%,0)_80%)] blur-3xl" />
        <div className="absolute right-[-25%] top-[10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.08)_0,hsla(0,0%,45%,.03)_80%,transparent_100%)] blur-2xl" />
        <div className="absolute bottom-[-20%] left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] blur-2xl" />
      </div>

      <section>
        <div className="relative pt-24 md:pt-32">
          <div className="-z-10 absolute inset-0 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--color-background)_75%)]" />
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center sm:mx-auto lg:mt-0 lg:mr-auto">
              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0, transition }}
                viewport={{ once: true, amount: 0.6 }}
                className="text-balance font-heading text-4xl md:text-7xl lg:mt-8 xl:text-[5rem]"
              >
                Vende en línea más rápido y sin complicaciones
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { ...transition, delay: 0.05 },
                }}
                viewport={{ once: true, amount: 0.6 }}
                className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground"
              >
                Cetus es la plataforma e‑commerce para lanzar tu tienda en
                minutos. Crea tu catálogo, gestiona inventario y cobra con
                MercadoPago desde un sistema ágil y económico.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { ...transition, delay: 0.1 },
                }}
                viewport={{ once: true, amount: 0.6 }}
                className="mt-10 flex flex-col items-center justify-center gap-3 md:flex-row"
              >
                <Button asChild className="px-5 text-base" size="lg">
                  <Link to="/sign-up">
                    <span className="text-nowrap">Empieza gratis hoy</span>
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">
                  Sin tarjeta, cancela cuando quieras
                </span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{
                  opacity: 1,
                  scale: 1,
                  transition: { ...transition, delay: 0.12 },
                }}
                viewport={{ once: true, amount: 0.4 }}
                aria-hidden
                className="mx-auto mt-14 h-56 w-full max-w-5xl rounded border bg-muted/40 backdrop-blur-sm"
              >
                <div className="h-full w-full rounded bg-[linear-gradient(180deg,hsla(0,0%,100%,.06),transparent)]" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0, transition }}
            viewport={{ once: true, amount: 0.6 }}
            className="font-heading text-2xl md:text-4xl"
          >
            Todo lo que necesitas para vender
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{
              opacity: 1,
              y: 0,
              transition: { ...transition, delay: 0.05 },
            }}
            viewport={{ once: true, amount: 0.6 }}
            className="mt-3 text-muted-foreground"
          >
            Configura tu tienda, acepta pagos, gestiona pedidos y crece con
            herramientas hechas para convertir.
          </motion.p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              title: 'Configura en minutos',
              desc: 'Publica productos, personaliza tu marca y abre tu tienda sin conocimientos técnicos.',
            },
            {
              title: 'Pagos seguros',
              desc: 'Integra MercadoPago en un clic y ofrece cuotas, pagos con tarjeta o efectivo.',
            },
            {
              title: 'Gestión simple',
              desc: 'Controla inventario, pedidos y envíos desde un panel moderno y veloz.',
            },
          ].map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{
                opacity: 1,
                y: 0,
                transition: { ...transition, delay: idx * 0.06 },
              }}
              viewport={{ once: true, amount: 0.5 }}
              className="rounded border bg-background/40 p-6"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <div className="grid grid-cols-1 items-start gap-10 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0, transition }}
            viewport={{ once: true, amount: 0.5 }}
          >
            <h2 className="font-heading text-2xl md:text-3xl">Cómo funciona</h2>
            <p className="mt-3 text-muted-foreground">
              Sube tus productos, activa pagos y comparte tu tienda. Empieza
              pequeño y escala sin fricción.
            </p>

            <ol className="mt-6 space-y-4">
              {[
                {
                  step: '1',
                  title: 'Crea tu cuenta',
                  desc: 'Regístrate y completa la información básica de tu tienda.',
                },
                {
                  step: '2',
                  title: 'Agrega productos',
                  desc: 'Carga fotos, precios y stock en pocos clics.',
                },
                {
                  step: '3',
                  title: 'Activa pagos',
                  desc: 'Conecta MercadoPago y comienza a recibir ventas.',
                },
              ].map((s) => (
                <li key={s.step} className="flex gap-4">
                  <div
                    aria-hidden
                    className="mt-1 flex size-7 items-center justify-center rounded-full border text-xs font-medium"
                  >
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-medium">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6">
              <Button asChild className="px-5" size="lg">
                <Link to="/sign-up">
                  <span>Crear mi tienda</span>
                </Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1, transition }}
            viewport={{ once: true, amount: 0.4 }}
            aria-hidden
            className="h-80 w-full rounded border bg-muted/30"
          >
            <div className="h-full w-full rounded bg-[repeating-linear-gradient(135deg,transparent,transparent_12px,hsla(0,0%,100%,.05)_12px,hsla(0,0%,100%,.05)_24px)]" />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0, transition }}
          viewport={{ once: true, amount: 0.6 }}
          className="rounded border bg-background/40 p-6 text-center"
        >
          <h2 className="font-heading text-2xl">
            Integraciones listas para usar
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
            Conecta fácilmente tu tienda con herramientas de pago, análisis y
            envíos. MercadoPago está integrado de forma nativa.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span className="rounded-full border px-3 py-1">MercadoPago</span>
            <span className="rounded-full border px-3 py-1">Analytics</span>
            <span className="rounded-full border px-3 py-1">Email</span>
            <span className="rounded-full border px-3 py-1">SEO</span>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto my-28 max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0, transition }}
          viewport={{ once: true, amount: 0.6 }}
          className="relative overflow-hidden rounded border bg-gradient-to-b from-background to-muted/30 p-10 text-center"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-primary/10 blur-3xl"
          />

          <h2 className="font-heading text-2xl md:text-4xl">
            Empieza a vender hoy
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Lanza tu tienda en minutos y enfócate en crecer. Nosotros nos
            encargamos del resto.
          </p>
          <div className="mt-7 flex items-center justify-center">
            <Button asChild className="px-5" size="lg">
              <Link to="/sign-up">
                <span>Crear cuenta gratis</span>
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
