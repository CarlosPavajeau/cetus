import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { ContactCard } from "~/features/contacts/ContactCard";
import { categories } from "~/features/contacts/labels";
import { contactsQuery } from "~/features/contacts/queries";

/** Who receives the account's notices, per category. */
export const Route = createFileRoute("/_app/settings/contacts")({
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(contactsQuery);
    return { crumb: "Contactos" };
  },
  component: Contacts,
});

function Contacts() {
  const { session } = Route.useRouteContext();
  const { data: contacts } = useSuspenseQuery(contactsQuery);
  const impersonating = Boolean(session.impersonatedBy);

  return (
    <>
      <PageHeader
        title="Contactos"
        lead="Elige quién recibe los avisos de Cetus antes de que un problema detenga tu facturación. Cada correo se verifica con un enlace antes de usarlo."
      />
      {impersonating && (
        <Alert>
          <AlertTitle>No disponible durante la sesión de soporte</AlertTitle>
          <AlertDescription>
            Los contactos solo los cambia la persona dueña de la cuenta.
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
            readOnly={impersonating}
          />
        ))}
      </div>
    </>
  );
}
