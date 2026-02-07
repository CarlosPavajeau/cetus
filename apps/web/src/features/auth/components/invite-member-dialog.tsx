import { authClient } from '@cetus/auth/client'
import { builtInRole } from '@cetus/shared/constants/common'
import { Button } from '@cetus/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@cetus/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@cetus/ui/form'
import { Input } from '@cetus/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cetus/ui/select'
import { SubmitButton } from '@cetus/web/components/submit-button'
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
      resend: true,
    })

    if (result.error) {
      toast.error('No se pudo enviar la invitación')
      return
    }

    toast.success('Invitación enviada con éxito')
    setOpen(false)
  })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
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
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ejemplo: example@example.com"
                      type="email"
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
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {builtInRole.map((role) => (
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
                disabled={form.formState.isSubmitting}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <SubmitButton
                disabled={!form.formState.isValid}
                isSubmitting={form.formState.isSubmitting}
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
