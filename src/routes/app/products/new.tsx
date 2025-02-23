import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Protect } from '@clerk/clerk-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { type TypeOf, z } from 'zod'

export const Route = createFileRoute('/app/products/new')({
  component: RouteComponent,
})

const createProductSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  stock: z.number(),
})

type FormValues = TypeOf<typeof createProductSchema>

function RouteComponent() {
  const form = useForm<FormValues>({
    resolver: zodResolver(createProductSchema),
  })

  const onSubmit = form.handleSubmit((values) => {
    console.log(values)
  })

  return (
    <Protect>
      <div className="flex min-h-[calc(100vh-20rem)] w-full flex-col space-y-4">
        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input type="text" autoFocus {...field} />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
    </Protect>
  )
}
