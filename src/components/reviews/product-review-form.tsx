import { SubmitButton } from '@/components/submit-button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { useCreateProductReview } from '@/hooks/reviews'
import {
  type CreateProductReview,
  CreateProductReviewSchema,
} from '@/schemas/reviews'
import { cn } from '@/shared/cn'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { StarIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

type Props = {
  reviewRequestId: string
}

export function ProductReviewForm({ reviewRequestId }: Props) {
  const navigate = useNavigate()
  const createReviewMutation = useCreateProductReview()

  const [hoverRating, setHoverRating] = useState('')

  const form = useForm({
    resolver: arktypeResolver(CreateProductReviewSchema),
    defaultValues: {
      reviewRequestId,
      rating: 0,
      comment: '',
    },
  })

  const queryClient = useQueryClient()

  const onSubmit = async (values: CreateProductReview) => {
    try {
      await createReviewMutation.mutateAsync(values)
      toast.success('¡Gracias por tu reseña!')
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      navigate({ to: '/' })
    } catch (error) {
      toast.error(
        'Hubo un error al enviar tu reseña. Por favor, inténtalo de nuevo.',
      )
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Calificación</FormLabel>
              <FormControl>
                <div className="flex items-center gap-2">
                  <RadioGroup
                    className="inline-flex gap-0"
                    onValueChange={field.onChange}
                  >
                    {['1', '2', '3', '4', '5'].map((value) => (
                      // biome-ignore lint/nursery/noNoninteractiveElementInteractions: required for hover animation
                      <label
                        className="group relative cursor-pointer rounded p-0.5 outline-none has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
                        htmlFor={`${field.name}-${value}`}
                        key={value}
                        onMouseEnter={() => setHoverRating(value)}
                        onMouseLeave={() => setHoverRating('')}
                      >
                        <RadioGroupItem
                          className="sr-only"
                          id={`${field.name}-${value}`}
                          value={value}
                        />
                        <StarIcon
                          className={cn(
                            'h-8 w-8 transition-all group-hover:scale-110',
                            (hoverRating || field.value) >= value
                              ? 'fill-warning-base text-warning-base'
                              : 'text-input',
                          )}
                          size={24}
                        />
                        <span className="sr-only">
                          {value} star{value === '1' ? '' : 's'}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comentario</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[120px] resize-none"
                  placeholder="Cuéntanos tu experiencia con el producto..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <SubmitButton
          disabled={createReviewMutation.isPending}
          isSubmitting={createReviewMutation.isPending}
        >
          Enviar reseña
        </SubmitButton>
      </form>
    </Form>
  )
}
