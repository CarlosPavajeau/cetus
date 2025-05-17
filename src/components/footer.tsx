import { Link } from '@tanstack/react-router'
import { PhoneIcon } from 'lucide-react'
import { Separator } from './ui/separator'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-card">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <h3 className="font-bold text-lg">TELEDIGITAL JYA</h3>
            <p className="text-muted-foreground text-sm">
              Ofrecemos productos de alta calidad con el mejor servicio al
              cliente.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Enlaces rápidos
            </h3>
            <ul className="space-y-2">
              {[
                { name: 'Inicio', href: '/' },
                { name: 'Carrito', href: '/cart' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground text-sm hover:text-primary"
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
              {[
                { name: 'Términos y condiciones', href: '/terms' },
                { name: 'Política de privacidad', href: '/privacy' },
                { name: 'Política de garantía', href: '/returns' },
                { name: 'Preguntas frecuentes', href: '/faq' },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-muted-foreground text-sm hover:text-primary"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Contacto
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <PhoneIcon className="mr-2 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <a
                  href="tel:+573233125221"
                  className="text-sm hover:text-primary"
                >
                  +57 323 312 5221
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col items-center justify-between md:flex-row">
          <p className="text-muted-foreground text-sm">
            &copy; {currentYear} TELEDIGITAL JYA. Todos los derechos reservados.
          </p>
          <div className="mt-4 md:mt-0">
            <p className="text-muted-foreground text-xs">
              Diseñado y desarrollado con{' '}
              <span className="text-red-500">❤</span> por{' '}
              <a
                href="https://www.cantte.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
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
