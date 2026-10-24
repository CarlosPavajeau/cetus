import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type } from "arktype";
import { UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CopyButton } from "~/components/CopyButton";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Spinner } from "~/components/ui/spinner";
import { SelectField } from "~/features/issuance/fields";
import { TextField } from "~/features/setup/fields";
import { assignableMemberRoles } from "~/lib/auth/permissions";

import { assignableRoleItems } from "./labels";
import { membersQuery } from "./queries";
import { inviteMember } from "./server";

const invitationSchema = type({
  "+": "delete",
  email: type("string.trim").to(
    type("string.email").configure({ message: "Escribe un correo válido." }),
  ),
  role: type.enumerated(...assignableMemberRoles),
});

type InvitationValues = typeof invitationSchema.infer;

const empty: InvitationValues = { email: "", role: "biller" };

/**
 * Invites someone with a role. The console sends no email: the dialog shows the link to share, which only
 * works for the invited address.
 */
export function InviteMember() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm<InvitationValues>({
    resolver: arktypeResolver(invitationSchema),
    defaultValues: empty,
  });
  const role = useWatch({ control: form.control, name: "role" });
  const invite = useMutation({
    mutationFn: inviteMember,
    onSuccess: (result) =>
      result.ok ? queryClient.invalidateQueries({ queryKey: membersQuery.queryKey }) : undefined,
  });
  const invited = invite.data?.ok ? invite.data : null;
  const failure =
    invite.data && !invite.data.ok
      ? invite.data.message
      : invite.error
        ? "No pudimos comunicarnos con Cetus. Revisa tu conexión e inténtalo de nuevo."
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          form.reset(empty);
          invite.reset();
        }
      }}
    >
      <DialogTrigger render={<Button />}>
        <UserPlusIcon data-icon="inline-start" />
        Invitar
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {invited ? (
          <>
            <DialogHeader>
              <DialogTitle>Comparte el enlace de la invitación</DialogTitle>
              <DialogDescription>
                Envíaselo a {form.getValues("email")}. Solo sirve con ese correo, una vez, y vence
                en 48 horas.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
              <code className="min-w-0 flex-1 truncate text-xs">{invited.url}</code>
              <CopyButton value={invited.url} label="Copiar enlace" />
            </div>
            <DialogFooter>
              <DialogClose render={<Button />}>Listo</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form
            className="contents"
            noValidate
            onSubmit={form.handleSubmit((values) => invite.mutate({ data: values }))}
          >
            <DialogHeader>
              <DialogTitle>Invitar a la organización</DialogTitle>
              <DialogDescription>
                Entra con su propio usuario y ve lo mismo que tú, según su rol.
              </DialogDescription>
            </DialogHeader>
            <TextField
              control={form.control}
              name="email"
              label="Correo"
              type="email"
              autoComplete="off"
            />
            <SelectField
              control={form.control}
              name="role"
              label="Rol"
              items={assignableRoleItems}
              hint={assignableRoleItems.find((item) => item.value === role)?.description}
            />
            {failure && (
              <Alert variant="destructive">
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending && <Spinner data-icon="inline-start" />}
                Crear invitación
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
