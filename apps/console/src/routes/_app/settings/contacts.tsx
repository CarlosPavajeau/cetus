import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ContactCard } from "~/features/contacts/ContactCard";
import { categories } from "~/features/contacts/labels";
import { canManageContactsQuery, contactsQuery } from "~/features/contacts/queries";

/** Who receives the account's notices, per category. */
export const Route = createFileRoute("/_app/settings/contacts")({
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(contactsQuery),
      queryClient.ensureQueryData(canManageContactsQuery),
    ]);
    return { crumb: "Contactos" };
  },
  component: Contacts,
});

function Contacts() {
  const { session } = Route.useRouteContext();
  const { data: contacts } = useSuspenseQuery(contactsQuery);
  const { data: canManage } = useSuspenseQuery(canManageContactsQuery);
  const impersonating = Boolean(session.impersonatedBy);
  // A new account's contacts wait for the owner to confirm their address.
  const unverified = contacts.length > 0 && contacts.every((contact) => !contact.email);
  const waitingFor = contacts.find((contact) => contact.pendingEmail)?.pendingEmail;

  return (
    <>
      <PageHeader
        title="Contactos"
        lead="Elige quién recibe los avisos de Cetus antes de que un problema detenga tu facturación. Cada correo se verifica con un enlace antes de usarlo."
      />
      {impersonating ? (
        <Alert>
          <AlertTitle>No disponible durante la sesión de soporte</AlertTitle>
          <AlertDescription>
            Los contactos solo los cambia la persona dueña de la cuenta.
          </AlertDescription>
        </Alert>
      ) : (
        !canManage && (
          <Alert>
            <AlertTitle>Solo lectura</AlertTitle>
            <AlertDescription>
              Los contactos los cambian los dueños y administradores de la organización.
            </AlertDescription>
          </Alert>
        )
      )}
      {unverified && waitingFor && (
        <Alert>
          <AlertTitle>Confirma tu correo para recibir los avisos</AlertTitle>
          <AlertDescription>
            Enviamos un enlace a {waitingFor}. Hasta que lo abras y confirmes el correo, Cetus no
            envía avisos de esta cuenta.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid max-w-3xl gap-4">
        {categories.map((category) => (
          <ContactCard
            key={category.value}
            category={category.value}
            title={category.title}
            description={category.description}
            contact={contacts.find((contact) => contact.category === category.value)}
            readOnly={impersonating || !canManage}
          />
        ))}
      </div>
    </>
  );
}
