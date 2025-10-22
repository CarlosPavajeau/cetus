import { Link } from '@tanstack/react-router'
import { PhoneIcon } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useTenantStore } from '@/store/use-tenant-store'

const fastLinks = [
  { name: 'Inicio', href: '/' },
  { name: 'Carrito', href: '/cart' },
]

const legalLinks = [
  { name: 'Términos y condiciones', href: '/terms' },
  { name: 'Política de privacidad', href: '/privacy' },
  { name: 'Política de garantía', href: '/returns' },
  { name: 'Preguntas frecuentes', href: '/faq' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { store } = useTenantStore()

  const title = store?.name ?? 'cetus'
  const description = store
    ? 'Ofrecemos productos de alta calidad con el mejor servicio al cliente.'
    : 'Vende en línea más rápido y sin complicaciones'
  const storePhone = store?.phone

  return (
    <footer className="mt-auto border-t bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Enlaces rápidos
            </h3>
            <ul className="space-y-2">
              {fastLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    className="text-muted-foreground text-sm hover:text-primary"
                    to={link.href}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Legal
            </h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    className="text-muted-foreground text-sm hover:text-primary"
                    to={link.href}
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {storePhone && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wider">
                Contacto
              </h3>
              <ul className="space-y-3">
                <li className="flex items-center">
                  <PhoneIcon className="mr-2 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                  <a
                    className="text-sm hover:text-primary"
                    href={`tel:+${storePhone}`}
                  >
                    {storePhone}
                  </a>
                </li>
              </ul>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col items-center justify-between md:flex-row">
          <p className="text-muted-foreground text-sm">
            &copy; {currentYear} {title}. Todos los derechos reservados.
          </p>
          <div className="mt-4 md:mt-0">
            <p className="text-muted-foreground text-xs">
              Diseñado y desarrollado con{' '}
              <span className="text-red-500">❤</span> por{' '}
              <a
                className="text-primary underline"
                href="https://www.cantte.com/"
                rel="noopener noreferrer"
                target="_blank"
              >
                cantte
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
