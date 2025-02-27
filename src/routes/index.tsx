import { CartButton } from '@/components/cart-button'
import { ProductGrid } from '@/components/product-grid'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCategories } from '@/hooks/use-categories'
import { useProductsForSale } from '@/hooks/use-products-for-sale'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Loader2, XIcon } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/')({
  component: IndexPage,
})

function IndexPage() {
  const { products, isLoading } = useProductsForSale()

  const { categories, isLoading: isLoadingCategories } = useCategories()
  const [selectedCategory, setSelectedCategory] = useState('all')

  return (
    <>
      <header className="before:-inset-x-32 relative mb-14 before:absolute before:bottom-0 before:h-px before:bg-[linear-gradient(to_right,--theme(--color-border/.3),--theme(--color-border)_200px,--theme(--color-border)_calc(100%-200px),--theme(--color-border/.3))]">
        <div
          className="before:-bottom-px before:-left-12 before:-ml-px after:-right-12 after:-bottom-px after:-mr-px before:absolute before:z-10 before:size-[3px] before:bg-ring/50 after:absolute after:z-10 after:size-[3px] after:bg-ring/50"
          aria-label="hidden"
        ></div>

        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <h1 className="font-bold font-heading text-2xl text-foreground">
              Cetus
            </h1>
          </Link>

          <div className="flex items-center gap-4 sm:gap-8">
            <CartButton />
          </div>
        </div>
      </header>

      <main className="grow">
        <div data-home="true">
          <div className="max-w-3xl max-sm:text-center">
            <h1 className="mb-4 font-bold font-heading text-4xl/[1.1] text-foreground tracking-tight md:text-5xl/[1.1]">
              Nuestros productos
            </h1>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {!isLoadingCategories && categories && (
              <div className="*:not-first:mt-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Seleccionar categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {selectedCategory !== 'all' && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Badge className="gap-0">
                Categoria:{' '}
                {
                  categories?.find(
                    (category) => category.id === selectedCategory,
                  )?.name
                }
                <button className="-my-px -ms-px -me-1.5 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[inherit] p-0 text-primary-foreground/60 outline-none transition-[color,box-shadow] hover:text-primary-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  <XIcon size={12} aria-hidden="true" />
                </button>
              </Badge>
            </div>
          )}

          <div className="relative my-8">
            {isLoading && (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {products && <ProductGrid products={products} />}
          </div>
        </div>
      </main>
    </>
  )
}
