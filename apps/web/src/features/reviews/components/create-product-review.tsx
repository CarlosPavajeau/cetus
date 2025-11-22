import { api } from '@cetus/api-client'
import { createProductReviewSchema } from '@cetus/schemas/review.schema'
import { Field, FieldError, FieldGroup, FieldLabel } from '@cetus/ui/field'
import { RadioGroup, RadioGroupItem } from '@cetus/ui/radio-group'
import { Textarea } from '@cetus/ui/textarea'
import { SubmitButton } from '@cetus/web/components/submit-button'
import { cn } from '@cetus/web/shared/cn'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { StarIcon } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

type Props = {
  reviewRequestId: string
}

export function CreateProductReview({ reviewRequestId }: Readonly<Props>) {
  const form = useForm({
    resolver: arktypeResolver(createProductReviewSchema),
    defaultValues: {
      reviewRequestId,
      rating: 0,
      comment: '',
    },
  })
  const [hoverRating, setHoverRating] = useState('')

  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationKey: ['reviews', 'create'],
    mutationFn: api.reviews.create,
    onSuccess: () => {
      toast.success('¡Gracias por tu reseña!')
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      navigate({ to: '/' })
    },
    onError: () => {
      toast.error(
        'Hubo un error al enviar tu reseña. Por favor, inténtalo de nuevo.',
      )
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    mutation.mutate(values)
  })

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="rating"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel>Calificación</FieldLabel>
              <div className="flex items-center gap-2">
                <RadioGroup
                  className="inline-flex gap-0"
                  onValueChange={(val) => field.onChange(Number(val))}
                >
                  {['1', '2', '3', '4', '5'].map((value) => (
                    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: required for hover animation
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
                          (hoverRating || String(field.value)) >= value
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="comment"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="comment">Comentario</FieldLabel>
              <Textarea
                {...field}
                aria-invalid={fieldState.invalid}
                className="min-h-[120px] resize-none"
                id="comment"
                placeholder="Cuéntanos tu experiencia con el producto..."
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <SubmitButton
        disabled={mutation.isPending}
        isSubmitting={mutation.isPending}
      >
        Enviar reseña
      </SubmitButton>
    </form>
  )
}
