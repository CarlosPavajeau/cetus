import { Button } from '@cetus/web/components/ui/button'
import {
  CreditCardIcon,
  PackageIcon,
  Settings01Icon,
  ShippingTruck01Icon,
  ShoppingCart01Icon,
  Store03Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { domAnimation, LazyMotion, m } from 'motion/react'

const FeatureCard = ({
  icon,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  delay: number
}) => {
  const transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
  return (
    <m.div
      className="rounded-lg border bg-background/50 p-6 text-center"
      initial={{ opacity: 0, y: 18 }}
      viewport={{ once: true, amount: 0.5 }}
      whileInView={{
        opacity: 1,
        y: 0,
        transition: { ...transition, delay },
      }}
    >
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg border bg-background">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-2 text-balance text-muted-foreground text-sm">{desc}</p>
    </m.div>
  )
}

export function ApplicationHome() {
  const transition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <LazyMotion features={domAnimation}>
      <main className="overflow-hidden">
        <section className="relative pt-24 md:pt-32">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 select-none"
          >
            <div className="absolute top-[-20%] left-[-10%] h-160 w-xl rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.10)_0,hsla(0,0%,55%,.04)_50%,hsla(0,0%,45%,0)_80%)] blur-3xl" />
          </div>
          <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,hsl(var(--background))_75%)]" />

          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center">
              <m.h1
                className="text-balance font-heading text-4xl md:text-6xl lg:mt-8 xl:text-7xl"
                initial={{ opacity: 0, y: 24 }}
                viewport={{ once: true, amount: 0.6 }}
                whileInView={{ opacity: 1, y: 0, transition }}
              >
                La plataforma para construir tu e-commerce, a tu manera
              </m.h1>

              <m.p
                className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground"
                initial={{ opacity: 0, y: 16 }}
                viewport={{ once: true, amount: 0.6 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { ...transition, delay: 0.05 },
                }}
              >
                Crea tu tienda online, administra tus productos y gestiona tus
                órdenes en un solo lugar. Cetus te da las herramientas para
                vender sin complicaciones.
              </m.p>

              <m.div
                className="mt-10 flex flex-col items-center justify-center gap-4 md:flex-row"
                initial={{ opacity: 0, y: 12 }}
                viewport={{ once: true, amount: 0.6 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  transition: { ...transition, delay: 0.1 },
                }}
              >
                <Button asChild size="lg">
                  <Link to="/sign-up">
                    <span className="text-nowrap">Empieza gratis</span>
                  </Link>
                </Button>
                <span className="text-muted-foreground text-sm">
                  Sin tarjeta de crédito requerida.
                </span>
              </m.div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-32 max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <m.h2
              className="font-heading text-3xl md:text-4xl"
              initial={{ opacity: 0, y: 16 }}
              viewport={{ once: true, amount: 0.6 }}
              whileInView={{ opacity: 1, y: 0, transition }}
            >
              Control total sobre tu negocio
            </m.h2>
            <m.p
              className="mt-4 text-lg text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              viewport={{ once: true, amount: 0.6 }}
              whileInView={{
                opacity: 1,
                y: 0,
                transition: { ...transition, delay: 0.05 },
              }}
            >
              Desde la gestión de tu inventario hasta el seguimiento de tus
              ventas, todo en una plataforma simple y potente.
            </m.p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              delay={0.1}
              desc="Crea, edita y organiza tus productos con un sistema de inventario fácil de usar."
              icon={
                <HugeiconsIcon
                  className="text-muted-foreground"
                  icon={PackageIcon}
                  size={24}
                />
              }
              title="Gestiona tu Inventario"
            />
            <FeatureCard
              delay={0.2}
              desc="Visualiza y procesa tus órdenes, gestiona envíos y mantén a tus clientes informados."
              icon={
                <HugeiconsIcon
                  className="text-muted-foreground"
                  icon={ShippingTruck01Icon}
                  size={24}
                />
              }
              title="Administra tus Pedidos"
            />
            <FeatureCard
              delay={0.3}
              desc="Acepta pagos de forma segura con integraciones directas a las pasarelas más populares."
              icon={
                <HugeiconsIcon
                  className="text-muted-foreground"
                  icon={CreditCardIcon}
                  size={24}
                />
              }
              title="Procesa Pagos Seguros"
            />
          </div>
        </section>

        <section className="mx-auto mt-32 max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
            <m.div
              initial={{ opacity: 0, y: 18 }}
              viewport={{ once: true, amount: 0.5 }}
              whileInView={{ opacity: 1, y: 0, transition }}
            >
              <h2 className="font-heading text-3xl md:text-4xl">
                Lanza tu tienda en 3 simples pasos
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Configura tu e-commerce y empieza a vender en cuestión de
                minutos, sin necesidad de experiencia técnica.
              </p>

              <ol className="mt-8 space-y-6">
                {[
                  {
                    icon: (
                      <HugeiconsIcon
                        className="text-muted-foreground"
                        icon={Settings01Icon}
                        size={24}
                      />
                    ),
                    title: '1. Configura tu tienda',
                    desc: 'Personaliza la apariencia de tu tienda y define tus ajustes básicos.',
                  },
                  {
                    icon: (
                      <HugeiconsIcon
                        className="text-muted-foreground"
                        icon={PackageIcon}
                        size={24}
                      />
                    ),
                    title: '2. Agrega tus productos',
                    desc: 'Sube imágenes, descripciones y precios para tu catálogo.',
                  },
                  {
                    icon: (
                      <HugeiconsIcon
                        className="text-muted-foreground"
                        icon={ShoppingCart01Icon}
                        size={24}
                      />
                    ),
                    title: '3. Empieza a vender',
                    desc: 'Activa los métodos de pago y comparte tu tienda para recibir tus primeras órdenes.',
                  },
                ].map((s) => (
                  <li className="flex gap-6" key={s.title}>
                    <div className="flex size-10 items-center justify-center rounded-lg border bg-background">
                      {s.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="text-muted-foreground text-sm">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </m.div>

            <m.div
              aria-hidden
              className="hidden h-96 w-full items-center justify-center md:flex"
              initial={{ opacity: 0, scale: 0.95 }}
              viewport={{ once: true, amount: 0.4 }}
              whileInView={{ opacity: 1, scale: 1, transition }}
            >
              <div className="relative h-full w-full">
                <div className="absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2 bg-border" />
                <div className="absolute top-1/2 left-0 h-0.5 w-full -translate-y-1/2 bg-border" />
                <HugeiconsIcon
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground/30"
                  icon={Store03Icon}
                  size={96}
                />
              </div>
            </m.div>
          </div>
        </section>

        <section className="mx-auto my-32 max-w-7xl px-6">
          <m.div
            className="relative overflow-hidden rounded-lg border bg-linear-to-b from-background to-muted/30 px-6 py-16 text-center"
            initial={{ opacity: 0, y: 18 }}
            viewport={{ once: true, amount: 0.6 }}
            whileInView={{ opacity: 1, y: 0, transition }}
          >
            <h2 className="font-heading text-3xl md:text-4xl">
              ¿Listo para empezar a vender?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Crea tu cuenta gratis hoy mismo y descubre lo fácil que es tener
              tu propio e-commerce.
            </p>
            <div className="mt-8 flex items-center justify-center">
              <Button asChild size="lg">
                <Link to="/sign-up">
                  <span>Crear mi tienda gratis</span>
                </Link>
              </Button>
            </div>
          </m.div>
        </section>
      </main>
    </LazyMotion>
  )
}
