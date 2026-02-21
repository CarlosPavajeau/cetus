import { Badge } from '@cetus/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cetus/ui/card'
import type { ProductHighlight } from '@cetus/web/shared/home/constants'
import { Link } from '@tanstack/react-router'

type Props = {
  productHighlights: ProductHighlight[]
}

export function FeaturesSection({ productHighlights }: Props) {
  return (
    <section className="py-14 sm:py-16" id="features">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
            Módulos clave
          </p>
          <h2 className="mt-2 font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">
            Todo tu e-commerce en un panel técnico
          </h2>
        </div>
        <Link
          className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          to="/app"
        >
          Ver plataforma completa
        </Link>
      </div>
      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        id="shop"
      >
        {productHighlights.map((item) => {
          const isWide = item.className.includes('col-span-2')

          return (
            <Card
              className={`group h-full border border-border bg-card py-0 shadow-[0_1px_0_rgba(2,6,23,0.03)] backdrop-blur-sm transition-all dark:shadow-[0_1px_0_rgba(255,255,255,0.04)] ${isWide ? 'min-h-68' : 'min-h-60'} ${item.className}`}
              key={item.title}
            >
              <CardHeader className="p-6 pb-3">
                <CardTitle className="text-[1.08rem] text-foreground tracking-tight transition-colors group-hover:text-foreground">
                  {item.title}
                </CardTitle>
                <CardDescription className="max-w-[50ch] text-muted-foreground leading-relaxed">
                  {item.description}
                </CardDescription>
                <p className="text-foreground text-sm">{item.outcome}</p>
              </CardHeader>
              <CardContent className="mt-auto px-6 pb-6">
                <Badge variant="outline">{item.metric}</Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
