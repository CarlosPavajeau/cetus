import { createFileRoute } from '@tanstack/react-router'
import { EyeIcon, PackageIcon, SettingsIcon, ZapIcon } from 'lucide-react'
import { useState } from 'react'
import { ProductRegistrationForm } from '@/components/product/product-registration-form'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const Route = createFileRoute('/app/products/new')({
  ssr: false,
  component: CreateProductPage,
})

function CreateProductPage() {
  const [mode, setMode] = useState<'advanced' | 'simple' | null>(null)

  if (mode) {
    return (
      <div className="flex flex-1 flex-col items-center">
        <div className="w-full max-w-7xl space-y-3">
          <ProductRegistrationForm mode={mode} onBack={() => setMode(null)} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-balance font-bold font-heading text-4xl text-foreground">
          Registrar producto
        </h1>
        <p className="text-pretty text-muted-foreground text-xl">
          Crea y gestiona tu catálogo de productos con opciones avanzadas de
          variantes o registro de productos simples
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="transition-colors hover:border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <SettingsIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center justify-between text-foreground text-xl">
                  <span>Registro avanzado</span>
                  <Badge variant="secondary">Recomendado</Badge>
                </CardTitle>
                <CardDescription>
                  Gestión completa de productos con variantes y opciones
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PackageIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Información básica del producto</span>
              </div>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Opciones personalizadas (tamaño, color, sabor)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Variantes múltiples con imágenes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Vista previa en pantallas grandes
                </span>
              </div>
            </div>
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={() => setMode('advanced')}
                size="lg"
              >
                Iniciar registro avanzado
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="transition-colors hover:border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <ZapIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center justify-between text-foreground text-xl">
                  <span>Registro simple</span>
                  <Badge variant="secondary">Configuración rápida</Badge>
                </CardTitle>
                <CardDescription>
                  Configuración rápida para productos de variante única
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PackageIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Información básica del producto</span>
              </div>
              <div className="flex items-center gap-2">
                <ZapIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Gestión de precios y stock</span>
              </div>
              <div className="flex items-center gap-2">
                <EyeIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Carga de imágenes de productos</span>
              </div>
              <div className="flex items-center gap-2">
                <ZapIcon className="h-4 w-4 text-primary" />
                <span className="text-sm">Creación de una única variante</span>
              </div>
            </div>
            <div className="pt-4">
              <Button
                className="w-full"
                onClick={() => setMode('simple')}
                size="lg"
                variant="outline"
              >
                Iniciar registro simple
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
