import { Link, createFileRoute } from "@tanstack/react-router";
import { ConstructionIcon } from "lucide-react";

import { AuthLayout } from "~/components/AuthLayout";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

// Placeholder: the recovery email is not wired yet, so the form stays disabled.
function ForgotPassword() {
  return (
    <AuthLayout
      title="Recuperar contraseña"
      lead="Escribe el correo de tu cuenta y te enviaremos un enlace para crear una contraseña nueva."
    >
      <FieldGroup>
        <Alert>
          <ConstructionIcon />
          <AlertTitle>En construcción</AlertTitle>
          <AlertDescription>
            Pronto podrás recuperar tu contraseña desde aquí. Mientras tanto, escríbenos a soporte y
            te ayudamos a recuperar el acceso.
          </AlertDescription>
        </Alert>
        <Field data-disabled>
          <FieldLabel htmlFor="forgot-password-email">Correo electrónico</FieldLabel>
          <Input
            id="forgot-password-email"
            type="email"
            placeholder="tu@empresa.com"
            className="h-11 px-3"
            disabled
          />
        </Field>
        <Button size="lg" className="h-11" disabled>
          Enviar enlace
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          ¿La recordaste?{" "}
          <Link
            to="/sign-in"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Inicia sesión
          </Link>
        </p>
      </FieldGroup>
    </AuthLayout>
  );
}
