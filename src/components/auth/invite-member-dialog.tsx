import { authClient } from '@/auth/auth-client'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BUILT_IN_ROLES } from '@/shared/constants'
import { arktypeResolver } from '@hookform/resolvers/arktype'
import { type } from 'arktype'
import { UserPlus2Icon } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

const InviteMemberSchema = type({
  email: type('string.email').configure({
    message: 'Debe ingresar un email válido',
  }),
  role: type('"admin"|"member"|"owner"'),
})

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false)
  const onClose = () => {
    setOpen(false)
  }

  const form = useForm({
    resolver: arktypeResolver(InviteMemberSchema),
    defaultValues: {
      role: 'member',
    },
  })

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await authClient.organization.inviteMember({
      email: data.email,
      role: data.role,
    })

    if (result.error) {
      toast.error('No se puedo enviar la invitación')
      return
    }

    toast.success('Invitación enviada con éxito')
    setOpen(false)
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus2Icon />
          Invitar miembro
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar miembro</DialogTitle>
          <DialogDescription>
            Envia una invitación para agregar un nuevo miembro a tu
            organización.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Ejemplo: example@example.com"
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>

                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BUILT_IN_ROLES.map((role) => (
                        <SelectItem key={role.role} value={role.role}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={form.formState.isSubmitting}
                onClick={onClose}
              >
                Cancelar
              </Button>
              <SubmitButton
                isSubmitting={form.formState.isSubmitting}
                disabled={!form.formState.isValid}
              >
                Enviar invitación
              </SubmitButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
