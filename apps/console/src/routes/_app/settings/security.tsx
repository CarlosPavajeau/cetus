import { arktypeResolver } from "@hookform/resolvers/arktype";
import { createFileRoute, useBlocker, useNavigate, useRouter } from "@tanstack/react-router";
import { cn } from "cn";
import { DownloadIcon, RefreshCwIcon, ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { QRCode } from "react-qr-code";

import { CopyButton } from "~/components/CopyButton";
import { PageHeader } from "~/components/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { StatusBadge } from "~/components/ui/badge";
import { Button, buttonVariants } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { TotpCodeInput } from "~/features/auth/CodeInput";
import { type AuthError, tooManyAttemptsMessage } from "~/features/auth/errors";
import { PasswordInput } from "~/features/auth/PasswordInput";
import { enableTwoFactorSchema, verifyTotpSchema } from "~/features/auth/schema";
import { authClient } from "~/lib/auth/client";
import { supportEmail } from "~/lib/support";
import { internalPath } from "~/lib/utils";

/** `redirect`: the administration page the guard stopped a Cetus staff member at. */
type SecuritySearch = { required?: true; redirect?: string };

/** Two-factor authentication of the signed-in user. Mandatory for the Cetus team. */
export const Route = createFileRoute("/_app/settings/security")({
  validateSearch: (search: Record<string, unknown>): SecuritySearch => {
    if (search.required !== true && search.required !== "true") {
      return {};
    }
    const redirect = internalPath(search.redirect);
    return redirect ? { required: true, redirect } : { required: true };
  },
  component: Security,
});

type Enrollment = { totpURI: string; backupCodes: string[] };

/** Backup codes on screen: the first set, from enrolling, or a replacement for the previous set. */
type IssuedCodes = { codes: string[]; origin: "enrollment" | "regeneration" };

/** What leaving the page now would throw away. */
type Unsaved = "enrollment" | "codes";

type Confirming = "regenerate" | "disable";

function Security() {
  const { session } = Route.useRouteContext();
  const { required, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [issued, setIssued] = useState<IssuedCodes | null>(null);
  const [turnedOff, setTurnedOff] = useState(false);
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [viewSwapped, setViewSwapped] = useState(false);
  const leaving = useRef(false);
  const enabled = session.user.twoFactorEnabled;
  const unsaved: Unsaved | null = issued ? "codes" : enrollment ? "enrollment" : null;
  const blocker = useBlocker({
    shouldBlockFn: () => !leaving.current,
    enableBeforeUnload: () => !leaving.current,
    disabled: unsaved === null,
    withResolver: true,
  });

  return (
    <>
      <PageHeader
        title="Seguridad"
        status={
          enabled ? (
            <StatusBadge status="success" icon={<ShieldCheckIcon data-icon="inline-start" />}>
              Verificación activa
            </StatusBadge>
          ) : undefined
        }
        lead={
          enabled
            ? "Tu cuenta pide un código de tu aplicación de autenticación cada vez que inicias sesión, en cualquiera de tus organizaciones."
            : "Protege tu cuenta con un código de una aplicación de autenticación además de tu contraseña. Aplica en todas tus organizaciones."
        }
      />
      {required && !enabled && (
        <Alert role="note">
          <AlertTitle>Activa la verificación en dos pasos para continuar</AlertTitle>
          <AlertDescription>
            La administración de Cetus solo está disponible para cuentas con verificación en dos
            pasos. Toma un par de minutos: escaneas un código con tu aplicación de autenticación y
            guardas tus códigos de respaldo.
          </AlertDescription>
        </Alert>
      )}
      {session.impersonatedBy ? (
        <Alert role="note">
          <AlertTitle>No disponible durante la sesión de soporte</AlertTitle>
          <AlertDescription>
            La verificación en dos pasos solo la cambia la persona dueña de la cuenta.
          </AlertDescription>
        </Alert>
      ) : issued ? (
        <BackupCodes
          issued={issued}
          email={session.user.email}
          required={required === true}
          onDone={() => {
            setViewSwapped(true);
            if (required && issued.origin === "enrollment") {
              leaving.current = true;
              void navigate({ href: redirect ?? "/admin/organizations" });
            } else {
              setIssued(null);
            }
          }}
        />
      ) : enrollment ? (
        <VerifyEnrollment
          enrollment={enrollment}
          onCancel={() => {
            setViewSwapped(true);
            setEnrollment(null);
          }}
          onVerified={() => {
            setIssued({ codes: enrollment.backupCodes, origin: "enrollment" });
            setEnrollment(null);
          }}
        />
      ) : enabled ? (
        <div className="flex max-w-xl flex-col gap-10">
          <TwoFactorStatus
            focusTitle={viewSwapped}
            confirming={confirming === "regenerate"}
            onConfirmingChange={(open) => setConfirming(open ? "regenerate" : null)}
            onRegenerated={(codes) => {
              setConfirming(null);
              setIssued({ codes, origin: "regeneration" });
            }}
          />
          <DisableTwoFactor
            confirming={confirming === "disable"}
            onConfirmingChange={(open) => setConfirming(open ? "disable" : null)}
            onDisabled={() => {
              setConfirming(null);
              setTurnedOff(true);
            }}
          />
        </div>
      ) : (
        <>
          {turnedOff && <TurnedOffNotice />}
          <EnableTwoFactor
            focusTitle={viewSwapped && !turnedOff}
            onEnrolled={(started) => {
              setTurnedOff(false);
              setEnrollment(started);
            }}
          />
        </>
      )}
      {blocker.status === "blocked" && unsaved && (
        <LeaveWarning unsaved={unsaved} onStay={blocker.reset} onLeave={blocker.proceed} />
      )}
    </>
  );
}

/**
 * Focuses the returned element when it mounts, if `active` then: after a step of the page replaced the
 * view, never on the first load.
 */
function useFocusOnMount<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T>(null);
  const [activeOnMount] = useState(active);
  useEffect(() => {
    if (activeOnMount) {
      ref.current?.focus();
    }
  }, [activeOnMount]);
  return ref;
}

function LeaveWarning({
  unsaved,
  onStay,
  onLeave,
}: {
  unsaved: Unsaved;
  onStay: () => void;
  onLeave: () => void;
}) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onStay()}>
      <AlertDialogContent>
        {unsaved === "codes" ? (
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin guardar tus códigos de respaldo?</AlertDialogTitle>
            <AlertDialogDescription>
              No los volverás a ver. Sin ellos, si pierdes tu aplicación de autenticación te quedas
              sin acceso a la cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
        ) : (
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin terminar la activación?</AlertDialogTitle>
            <AlertDialogDescription>
              La verificación en dos pasos no quedará activa. Si ya escaneaste el código, tendrás
              que reemplazar la entrada de Cetus en tu aplicación cuando vuelvas a empezar.
            </AlertDialogDescription>
          </AlertDialogHeader>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>
            {unsaved === "codes" ? "Volver a los códigos" : "Seguir con la activación"}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onLeave}>
            Salir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function TurnedOffNotice() {
  const titleRef = useFocusOnMount<HTMLDivElement>(true);
  return (
    <Alert role="note" className="max-w-xl">
      <AlertTitle ref={titleRef} tabIndex={-1}>
        Verificación en dos pasos desactivada
      </AlertTitle>
      <AlertDescription>
        Tu cuenta ya no pide un código al iniciar sesión. Puedes volver a activarla aquí mismo.
      </AlertDescription>
    </Alert>
  );
}

function passwordErrorMessage(error: AuthError, fallback: string): string {
  if (error.status === 429) {
    return tooManyAttemptsMessage;
  }
  return error.code === "INVALID_PASSWORD" ? "La contraseña no coincide." : fallback;
}

function EnableTwoFactor({
  focusTitle,
  onEnrolled,
}: {
  focusTitle: boolean;
  onEnrolled: (enrollment: Enrollment) => void;
}) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>(focusTitle);
  const form = useForm({
    resolver: arktypeResolver(enableTwoFactorSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { data, error } = await authClient.twoFactor.enable({ password });
    if (error || !data || !("totpURI" in data)) {
      const fallback = `No pudimos iniciar la activación. Intenta de nuevo; si sigue fallando, escríbenos a ${supportEmail}.`;
      form.setError("root", {
        message: error ? passwordErrorMessage(error, fallback) : fallback,
      });
      return;
    }
    onEnrolled({ totpURI: data.totpURI, backupCodes: data.backupCodes });
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1}>
          Verificación en dos pasos
        </CardTitle>
        <CardDescription>
          Confirma tu contraseña para empezar. Necesitarás una aplicación como Google Authenticator,
          1Password o Authy.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="enable-2fa-password">Contraseña</FieldLabel>
                  <PasswordInput
                    {...field}
                    id="enable-2fa-password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            {errors.root && (
              <Alert variant="destructive">
                <AlertDescription>{errors.root.message}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner data-icon="inline-start" />}
            Activar verificación en dos pasos
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function VerifyEnrollment({
  enrollment,
  onVerified,
  onCancel,
}: {
  enrollment: Enrollment;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const secret = new URL(enrollment.totpURI).searchParams.get("secret") ?? "";
  const form = useForm({
    resolver: arktypeResolver(verifyTotpSchema),
    defaultValues: { code: "" },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    // On a touch screen the keyboard would cover the QR code and the link to the app.
    if (window.matchMedia("(pointer: fine)").matches) {
      form.setFocus("code");
    } else {
      titleRef.current?.focus();
    }
  }, [form]);

  const onSubmit = form.handleSubmit(async ({ code }) => {
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      form.setValue("code", "");
      form.setFocus("code");
      form.setError("root", {
        message:
          error.status === 429
            ? tooManyAttemptsMessage
            : "El código no es válido. Revísalo e intenta de nuevo.",
      });
      return;
    }
    onVerified();
    // The session now has 2FA: reload the guards' view of it.
    await router.invalidate();
  });

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1}>
          Conecta tu aplicación de autenticación
        </CardTitle>
        <CardDescription>
          Si sales de esta página antes de terminar, la configuración empieza de nuevo y tendrás que
          reemplazar la entrada de Cetus en tu aplicación.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <ol className="flex flex-col gap-8">
            <EnrollmentStep number={1} title="Agrega tu cuenta a la aplicación">
              <a
                href={enrollment.totpURI}
                className={cn(buttonVariants({ variant: "outline" }), "w-fit md:hidden")}
              >
                <SmartphoneIcon data-icon="inline-start" />
                Abrir en la aplicación de autenticación
              </a>
              <figure className="flex w-fit flex-col gap-2">
                {/* Rendered here: the URI holds the shared secret and must not go to a QR service. */}
                <div className="w-fit rounded-lg border bg-white p-4">
                  <QRCode
                    value={enrollment.totpURI}
                    size={176}
                    title="Código QR de la verificación"
                  />
                </div>
                <figcaption className="max-w-56 text-xs text-muted-foreground">
                  Escanéalo con Google Authenticator, 1Password, Authy u otra aplicación de
                  autenticación.
                </figcaption>
              </figure>
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">
                  ¿No puedes escanearlo? Escribe esta clave en la aplicación:
                </p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs">{secret.match(/.{1,4}/g)?.join(" ")}</code>
                  <CopyButton value={secret} label="Copiar clave" iconOnly />
                </div>
              </div>
            </EnrollmentStep>
            <EnrollmentStep number={2} title="Escribe el código que te muestra">
              <FieldGroup>
                <Controller
                  name="code"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="max-w-sm">
                      <FieldLabel htmlFor="verify-2fa-code">Código de verificación</FieldLabel>
                      <TotpCodeInput
                        {...field}
                        id="verify-2fa-code"
                        boxed
                        aria-invalid={fieldState.invalid}
                        onComplete={() => {
                          if (!form.formState.isSubmitting) {
                            void onSubmit();
                          }
                        }}
                      />
                      {fieldState.error ? (
                        <FieldError errors={[fieldState.error]} />
                      ) : (
                        <FieldDescription>
                          El código cambia periódicamente. Usa el más reciente.
                        </FieldDescription>
                      )}
                    </Field>
                  )}
                />
                {errors.root && (
                  <Alert variant="destructive">
                    <AlertDescription>{errors.root.message}</AlertDescription>
                  </Alert>
                )}
              </FieldGroup>
            </EnrollmentStep>
          </ol>
        </CardContent>
        <CardFooter className="mt-6">
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting ? "Verificando…" : "Verificar y activar"}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

function EnrollmentStep({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[1.25rem_1fr] gap-x-3 gap-y-3">
      <span
        aria-hidden
        className="flex size-5 items-center justify-center rounded-full border font-mono text-2xs tabular-nums"
      >
        {number}
      </span>
      <h3 className="text-sm font-medium">
        <span className="sr-only">Paso {number}: </span>
        {title}
      </h3>
      <div className="col-start-2 flex flex-col gap-4">{children}</div>
    </li>
  );
}

function BackupCodes({
  issued: { codes, origin },
  email,
  required,
  onDone,
}: {
  issued: IssuedCodes;
  email: string;
  required: boolean;
  onDone: () => void;
}) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>(true);

  function download() {
    const date = new Date().toISOString().slice(0, 10);
    const text = ["Códigos de respaldo de Cetus", email, date, "", ...codes, ""].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `cetus-codigos-de-respaldo-${date}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1}>
          {origin === "enrollment" ? (
            <span className="flex items-center gap-2">
              <ShieldCheckIcon aria-hidden className="size-4 text-success-foreground" />
              Verificación en dos pasos activada
            </span>
          ) : (
            "Nuevos códigos de respaldo"
          )}
        </CardTitle>
        <CardDescription>
          {origin === "regeneration" && "Los códigos anteriores ya no funcionan. "}
          Antes de seguir, guarda estos códigos de respaldo en tu gestor de contraseñas o en un
          lugar seguro. Cada uno sirve una sola vez para entrar si pierdes acceso a tu aplicación de
          autenticación. No los volverás a ver.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul
          aria-label="Códigos de respaldo"
          className="grid grid-cols-[repeat(2,max-content)] gap-x-10 gap-y-1.5 rounded-lg border bg-muted/40 p-4 font-mono text-xs tabular-nums"
        >
          {codes.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={codes.join("\n")} label="Copiar códigos" />
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <DownloadIcon data-icon="inline-start" />
            Descargar .txt
          </Button>
        </div>
      </CardContent>
      <CardFooter className="mt-6">
        <Button type="button" onClick={onDone}>
          {required && origin === "enrollment"
            ? "Ya los guardé, ir a la administración"
            : "Ya guardé mis códigos"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function TwoFactorStatus({
  focusTitle,
  confirming,
  onConfirmingChange,
  onRegenerated,
}: {
  focusTitle: boolean;
  confirming: boolean;
  onConfirmingChange: (open: boolean) => void;
  onRegenerated: (codes: string[]) => void;
}) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>(focusTitle);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1}>
          Códigos de respaldo
        </CardTitle>
        <CardDescription>
          Si pierdes acceso a tu aplicación de autenticación, entras con uno de tus códigos de
          respaldo. Genera nuevos si ya usaste varios o no sabes dónde quedaron.
        </CardDescription>
      </CardHeader>
      {confirming ? (
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Los códigos anteriores dejarán de funcionar. Confirma tu contraseña para generar los
            nuevos.
          </p>
          <PasswordConfirm
            id="regenerate-codes-password"
            submitLabel="Generar códigos"
            onConfirm={async (password) => {
              const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
              if (error) {
                return passwordErrorMessage(
                  error,
                  "No pudimos generar los códigos. Intenta de nuevo.",
                );
              }
              onRegenerated(data.backupCodes);
              return null;
            }}
            onCancel={() => {
              flushSync(() => onConfirmingChange(false));
              triggerRef.current?.focus();
            }}
          />
        </CardContent>
      ) : (
        <>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              ¿Perdiste la aplicación y los códigos? Escríbenos a{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="text-foreground underline underline-offset-3"
              >
                {supportEmail}
              </a>{" "}
              desde el correo de tu cuenta.
            </p>
          </CardContent>
          <CardFooter className="mt-2">
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              onClick={() => onConfirmingChange(true)}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Generar nuevos códigos de respaldo
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

function DisableTwoFactor({
  confirming,
  onConfirmingChange,
  onDisabled,
}: {
  confirming: boolean;
  onConfirmingChange: (open: boolean) => void;
  onDisabled: () => void;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <section aria-labelledby="disable-2fa-heading" className="flex flex-col gap-4 border-t pt-6">
      <div className="flex flex-col gap-1">
        <h2 id="disable-2fa-heading" className="text-sm font-medium">
          Desactivar la verificación en dos pasos
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Tu cuenta quedará protegida solo por la contraseña. Si eres parte del equipo de Cetus,
          perderás el acceso a la administración.
        </p>
      </div>
      {confirming ? (
        <PasswordConfirm
          id="disable-2fa-password"
          submitLabel="Desactivar verificación"
          destructive
          onConfirm={async (password) => {
            const { error } = await authClient.twoFactor.disable({ password });
            if (error) {
              return passwordErrorMessage(
                error,
                "No pudimos desactivar la verificación. Intenta de nuevo.",
              );
            }
            onDisabled();
            await router.invalidate();
            return null;
          }}
          onCancel={() => {
            flushSync(() => onConfirmingChange(false));
            triggerRef.current?.focus();
          }}
        />
      ) : (
        <div>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            onClick={() => onConfirmingChange(true)}
          >
            Desactivar verificación
          </Button>
        </div>
      )}
    </section>
  );
}

/** Asks for the password before a change to 2FA; `onConfirm` returns the error to show, if any. */
function PasswordConfirm({
  id,
  submitLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  id: string;
  submitLabel: string;
  destructive?: boolean;
  onConfirm: (password: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const form = useForm({
    resolver: arktypeResolver(enableTwoFactorSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    form.setFocus("password");
  }, [form]);

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const message = await onConfirm(password);
    if (message) {
      form.setError("root", { message });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FieldGroup>
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={id}>Contraseña</FieldLabel>
              <PasswordInput
                {...field}
                id={id}
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        {errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant={destructive ? "destructive" : "default"}
          disabled={isSubmitting}
        >
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
