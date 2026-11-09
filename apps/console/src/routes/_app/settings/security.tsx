import { arktypeResolver } from "@hookform/resolvers/arktype";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useBlocker, useNavigate, useRouter } from "@tanstack/react-router";
import { cn } from "cn";
import {
  DownloadIcon,
  QrCodeIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useReducer, useRef, useState } from "react";
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
import { Skeleton } from "~/components/ui/skeleton";
import { Spinner } from "~/components/ui/spinner";
import { timeFormat } from "~/features/api-keys/formats";
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

/** A new authenticator app waiting for its first code; the server drops it at `expiresAt`. */
type Replacement = { totpURI: string; expiresAt: Date };

/** What leaving the page now would throw away. */
type Unsaved = "enrollment" | "replacement" | "codes";

type Confirming = "replace" | "regenerate" | "disable";

/** The part of the page that takes focus after a step gave the view back to it. */
type Returning = "enable" | "app" | "codes";

/**
 * Where the page stands. `replaced` and `turnedOff` are the resting view with the outcome of the step
 * that just ended on top of it.
 */
type View =
  | { kind: "idle"; returning: Returning | null }
  | { kind: "enrolling"; enrollment: Enrollment }
  | { kind: "issued"; issued: IssuedCodes }
  | { kind: "replacing"; replacement: Replacement }
  | { kind: "replaced" }
  | { kind: "turnedOff" };

type Action =
  | { type: "enrolled"; enrollment: Enrollment }
  | { type: "enrollmentVerified" }
  | { type: "enrollmentCanceled" }
  | { type: "codesSaved" }
  | { type: "replacementStarted"; replacement: Replacement }
  | { type: "replacementVerified" }
  | { type: "replacementCanceled" }
  | { type: "regenerated"; codes: string[] }
  | { type: "turnedOff" };

function impossible(view: View, action: Action): never {
  throw new Error(`The security page cannot take ${action.type} while ${view.kind}`);
}

function transition(view: View, action: Action): View {
  const resting = view.kind === "idle" || view.kind === "replaced" || view.kind === "turnedOff";
  switch (action.type) {
    case "enrolled":
      return resting
        ? { kind: "enrolling", enrollment: action.enrollment }
        : impossible(view, action);
    case "enrollmentVerified":
      return view.kind === "enrolling"
        ? {
            kind: "issued",
            issued: { codes: view.enrollment.backupCodes, origin: "enrollment" },
          }
        : impossible(view, action);
    case "enrollmentCanceled":
      return view.kind === "enrolling"
        ? { kind: "idle", returning: "enable" }
        : impossible(view, action);
    case "codesSaved":
      return view.kind === "issued"
        ? { kind: "idle", returning: "codes" }
        : impossible(view, action);
    case "replacementStarted":
      return resting
        ? { kind: "replacing", replacement: action.replacement }
        : impossible(view, action);
    case "replacementVerified":
      return view.kind === "replacing" ? { kind: "replaced" } : impossible(view, action);
    case "replacementCanceled":
      return view.kind === "replacing"
        ? { kind: "idle", returning: "app" }
        : impossible(view, action);
    case "regenerated":
      return resting
        ? { kind: "issued", issued: { codes: action.codes, origin: "regeneration" } }
        : impossible(view, action);
    case "turnedOff":
      return resting ? { kind: "turnedOff" } : impossible(view, action);
    default:
      return impossible(view, action satisfies never);
  }
}

const unsavedByView: Partial<Record<View["kind"], Unsaved>> = {
  enrolling: "enrollment",
  issued: "codes",
  replacing: "replacement",
};

function Security() {
  const { session } = Route.useRouteContext();
  const { required, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [view, dispatch] = useReducer(transition, { kind: "idle", returning: null });
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const leaving = useRef(false);
  const enabled = session.user.twoFactorEnabled;
  const unsaved = unsavedByView[view.kind] ?? null;
  const returning = view.kind === "idle" ? view.returning : null;
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
        <Alert role="note" className="max-w-xl">
          <AlertTitle>Activa la verificación en dos pasos para continuar</AlertTitle>
          <AlertDescription>
            La administración de Cetus solo está disponible para cuentas con verificación en dos
            pasos. Toma un par de minutos: escaneas un código con tu aplicación de autenticación y
            guardas tus códigos de respaldo.
          </AlertDescription>
        </Alert>
      )}
      {session.impersonatedBy ? (
        <Alert role="note" className="max-w-xl">
          <AlertTitle>No disponible durante la sesión de soporte</AlertTitle>
          <AlertDescription>
            La verificación en dos pasos solo la cambia la persona dueña de la cuenta.
          </AlertDescription>
        </Alert>
      ) : view.kind === "issued" ? (
        <BackupCodes
          issued={view.issued}
          email={session.user.email}
          required={required === true}
          onDone={() => {
            if (required && view.issued.origin === "enrollment") {
              leaving.current = true;
              void navigate({ href: redirect ?? "/admin/organizations" });
            } else {
              dispatch({ type: "codesSaved" });
            }
          }}
        />
      ) : view.kind === "enrolling" ? (
        <VerifyEnrollment
          totpURI={view.enrollment.totpURI}
          onCancel={async () => {
            const { error } = await authClient.twoFactor.cancelEnrollment();
            if (error) {
              return `No pudimos cancelar la activación. Intenta de nuevo; si sigue fallando, escríbenos a ${supportEmail}.`;
            }
            dispatch({ type: "enrollmentCanceled" });
            return null;
          }}
          onVerified={() => dispatch({ type: "enrollmentVerified" })}
        />
      ) : view.kind === "replacing" ? (
        <VerifyEnrollment
          totpURI={view.replacement.totpURI}
          replacingUntil={view.replacement.expiresAt}
          onCancel={async () => {
            const { error } = await authClient.twoFactor.replaceTotp.cancel();
            if (error) {
              return "No pudimos cancelar el cambio de aplicación. Intenta de nuevo.";
            }
            dispatch({ type: "replacementCanceled" });
            return null;
          }}
          onVerified={() => dispatch({ type: "replacementVerified" })}
        />
      ) : enabled ? (
        <div className="flex max-w-xl flex-col gap-10">
          <div className="flex flex-col gap-6">
            {view.kind === "replaced" && (
              <Notice title="Cambiaste tu aplicación de autenticación">
                Los códigos de la anterior ya no sirven. Tus códigos de respaldo siguen funcionando.
              </Notice>
            )}
            <AuthenticatorApp
              focusTitle={returning === "app"}
              confirming={confirming === "replace"}
              locked={submitting}
              onSubmittingChange={setSubmitting}
              onConfirmingChange={(open) => setConfirming(open ? "replace" : null)}
              onStarted={(replacement) => {
                setConfirming(null);
                dispatch({ type: "replacementStarted", replacement });
              }}
            />
            <TwoFactorStatus
              focusTitle={returning === "codes"}
              confirming={confirming === "regenerate"}
              locked={submitting}
              onSubmittingChange={setSubmitting}
              onConfirmingChange={(open) => setConfirming(open ? "regenerate" : null)}
              onRegenerated={(codes) => {
                setConfirming(null);
                dispatch({ type: "regenerated", codes });
              }}
            />
          </div>
          <DisableTwoFactor
            confirming={confirming === "disable"}
            locked={submitting}
            onSubmittingChange={setSubmitting}
            onConfirmingChange={(open) => setConfirming(open ? "disable" : null)}
            staff={session.user.platformRole !== null}
            onDisabled={() => {
              setConfirming(null);
              dispatch({ type: "turnedOff" });
            }}
          />
        </div>
      ) : (
        <>
          {view.kind === "turnedOff" && (
            <Notice title="Verificación en dos pasos desactivada">
              Tu cuenta ya no pide un código al iniciar sesión. Puedes volver a activarla aquí
              mismo.
            </Notice>
          )}
          <EnableTwoFactor
            focusTitle={returning === "enable"}
            onEnrolled={(enrollment) => dispatch({ type: "enrolled", enrollment })}
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
        ) : unsaved === "replacement" ? (
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin terminar el cambio de aplicación?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu aplicación actual sigue activa. Si ya escaneaste el código nuevo, borra la entrada
              que agregaste: no servirá.
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
            {
              {
                codes: "Volver a los códigos",
                enrollment: "Seguir con la activación",
                replacement: "Seguir con el cambio",
              }[unsaved]
            }
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onLeave}>
            Salir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** The outcome of a step that just ended, focused so it is read before the rest of the page. */
function Notice({ title, children }: { title: string; children: ReactNode }) {
  const titleRef = useFocusOnMount<HTMLDivElement>(true);
  return (
    <Alert role="note" className="max-w-xl">
      <AlertTitle ref={titleRef} tabIndex={-1}>
        {title}
      </AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

function codeErrorMessage(error: AuthError): string {
  if (error.status === 429) {
    return tooManyAttemptsMessage;
  }
  return error.code === "REPLACEMENT_EXPIRED"
    ? "Pasaron más de 10 minutos y el cambio venció. Cancela y vuelve a empezar."
    : "El código no es válido. Revísalo e intenta de nuevo.";
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

/** Links an authenticator app: the first one when enrolling, or a new one in place of the active one. */
function VerifyEnrollment({
  totpURI,
  replacingUntil,
  onVerified,
  onCancel,
}: {
  totpURI: string;
  /** Set when replacing the active app: when the new secret stops waiting for its first code. */
  replacingUntil?: Date;
  onVerified: () => void;
  /** Drops the unverified secret; returns the message to show if that failed. */
  onCancel: () => Promise<string | null>;
}) {
  const replacing = replacingUntil !== undefined;
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  // A touch screen is usually the phone that holds the authenticator, so it cannot scan its own screen.
  const [pointerFine] = useState(() => window.matchMedia("(pointer: fine)").matches);
  const [qrShown, setQrShown] = useState(pointerFine);
  const secret = new URL(totpURI).searchParams.get("secret");
  if (!secret) {
    throw new Error("The TOTP URI has no secret");
  }
  const form = useForm({
    resolver: arktypeResolver(verifyTotpSchema),
    defaultValues: { code: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const [canceling, setCanceling] = useState(false);

  async function cancel() {
    setCanceling(true);
    const message = await onCancel().catch(
      () => "No pudimos cancelar. Revisa tu conexión e intenta de nuevo.",
    );
    if (message !== null) {
      setCanceling(false);
      form.setError("root", { message });
    }
  }

  useEffect(() => {
    // On a touch screen the keyboard would cover the link to the app.
    if (pointerFine) {
      form.setFocus("code");
    } else {
      titleRef.current?.focus();
    }
  }, [form, pointerFine]);

  const onSubmit = form.handleSubmit(async ({ code }) => {
    const { error } = replacing
      ? await authClient.twoFactor.replaceTotp.confirm({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      form.setValue("code", "");
      form.setFocus("code");
      form.setError("root", { message: codeErrorMessage(error) });
      return;
    }
    onVerified();
    if (!replacing) {
      // The session now has 2FA: reload the guards' view of it.
      await router.invalidate();
    }
  });

  const qrCode = qrShown && (
    <figure id="enrollment-qr" className="flex w-fit flex-col gap-2">
      {/* Rendered here: the URI holds the shared secret and must not go to a QR service. */}
      <div className="w-fit rounded-lg border bg-white p-4">
        <QRCode value={totpURI} size={176} title="Código QR de la verificación" />
      </div>
      <figcaption className="max-w-56 text-xs text-muted-foreground">
        Escanéalo con Google Authenticator, 1Password, Authy u otra aplicación de autenticación.
      </figcaption>
    </figure>
  );

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1}>
          {replacing ? "Conecta tu nueva aplicación" : "Conecta tu aplicación de autenticación"}
        </CardTitle>
        <CardDescription>
          {replacingUntil
            ? `Tu aplicación actual sigue funcionando hasta que confirmes un código de la nueva. Tienes hasta las ${timeFormat.format(replacingUntil)} para terminar el cambio.`
            : "Agrega Cetus a tu aplicación y confirma con el código que te muestra. Al terminar te damos tus códigos de respaldo."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <ol className="flex flex-col gap-8">
            <EnrollmentStep
              number={1}
              title={
                replacing
                  ? "Agrega tu cuenta a la nueva aplicación"
                  : "Agrega tu cuenta a la aplicación"
              }
            >
              {!pointerFine && (
                <a
                  href={totpURI}
                  className={cn(buttonVariants({ variant: "outline", size: "xl" }), "w-full")}
                >
                  <SmartphoneIcon data-icon="inline-start" />
                  Abrir en la aplicación de autenticación
                </a>
              )}
              {pointerFine && qrCode}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">
                  {pointerFine
                    ? "¿No puedes escanearlo? Escribe esta clave en la aplicación:"
                    : "¿No se abre? Escribe esta clave en la aplicación:"}
                </p>
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs">{secret.match(/.{1,4}/g)?.join(" ")}</code>
                  <CopyButton value={secret} label="Copiar clave" iconOnly />
                </div>
              </div>
              {!pointerFine && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xl"
                  className="-ml-2 w-fit"
                  aria-expanded={qrShown}
                  aria-controls="enrollment-qr"
                  onClick={() => setQrShown((shown) => !shown)}
                >
                  <QrCodeIcon data-icon="inline-start" />
                  {qrShown ? "Ocultar el código QR" : "Escanear desde otro dispositivo"}
                </Button>
              )}
              {!pointerFine && qrCode}
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
                          if (!form.formState.isSubmitting && !canceling) {
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
            <Button type="submit" disabled={isSubmitting || canceling}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting
                ? "Verificando…"
                : replacing
                  ? "Verificar y cambiar"
                  : "Verificar y activar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void cancel()}
              disabled={isSubmitting || canceling}
            >
              {canceling && <Spinner data-icon="inline-start" />}
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
          Guárdalos en tu gestor de contraseñas o en un lugar seguro. Cada uno sirve una sola vez
          para entrar si pierdes acceso a tu aplicación de autenticación.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm font-medium">No los volverás a ver.</p>
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

function AuthenticatorApp({
  focusTitle,
  confirming,
  locked,
  onSubmittingChange,
  onConfirmingChange,
  onStarted,
}: {
  focusTitle: boolean;
  confirming: boolean;
  /** Another 2FA change is waiting for the server: none may start until it answers. */
  locked: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onConfirmingChange: (open: boolean) => void;
  onStarted: (replacement: Replacement) => void;
}) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>(focusTitle);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1}>
          Aplicación de autenticación
        </CardTitle>
        <CardDescription>
          Te da el código que pedimos al iniciar sesión. Si cambias de teléfono o de aplicación,
          conecta la nueva aquí: la actual sigue funcionando hasta que la nueva quede lista.
        </CardDescription>
      </CardHeader>
      {confirming ? (
        <CardContent>
          <PasswordConfirm
            onSubmittingChange={onSubmittingChange}
            id="replace-app-password"
            submitLabel="Continuar"
            onConfirm={async (password) => {
              const { data, error } = await authClient.twoFactor.replaceTotp.start({ password });
              if (error) {
                return passwordErrorMessage(
                  error,
                  "No pudimos empezar el cambio de aplicación. Intenta de nuevo.",
                );
              }
              onStarted({ totpURI: data.totpURI, expiresAt: new Date(data.expiresAt) });
              return null;
            }}
            onCancel={() => {
              flushSync(() => onConfirmingChange(false));
              triggerRef.current?.focus();
            }}
          />
        </CardContent>
      ) : (
        <CardFooter className="mt-2">
          <Button
            ref={triggerRef}
            disabled={locked}
            type="button"
            variant="outline"
            onClick={() => onConfirmingChange(true)}
          >
            <SmartphoneIcon data-icon="inline-start" />
            Cambiar de aplicación
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

const backupCodeCountQuery = queryOptions({
  queryKey: ["two-factor", "backup-codes", "count"],
  queryFn: async () => {
    const { data, error } = await authClient.twoFactor.backupCodes.count();
    if (error) {
      throw new Error(error.message ?? "Could not count the backup codes");
    }
    return data;
  },
});

function BackupCodesLeft() {
  const { data, isPending, isError } = useQuery(backupCodeCountQuery);
  if (isPending) {
    return <Skeleton className="h-5 w-56" />;
  }
  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        No pudimos contar tus códigos. Recarga la página para intentarlo de nuevo.
      </p>
    );
  }
  const { remaining, total } = data;
  if (remaining === 0) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <StatusBadge status="error">Ya usaste todos tus códigos</StatusBadge>
        <p className="text-sm text-muted-foreground">
          Genera nuevos: sin ellos, si pierdes tu aplicación te quedas sin acceso.
        </p>
      </div>
    );
  }
  const left = (
    <>
      Te {remaining === 1 ? "queda" : "quedan"} <span className="tabular-nums">{remaining}</span> de{" "}
      <span className="tabular-nums">{total}</span> códigos
    </>
  );
  if (remaining <= 3) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <StatusBadge status="warning">{left}</StatusBadge>
        <p className="text-sm text-muted-foreground">Genera nuevos antes de que se acaben.</p>
      </div>
    );
  }
  return <p className="text-sm font-medium">{left}.</p>;
}

function TwoFactorStatus({
  focusTitle,
  confirming,
  locked,
  onSubmittingChange,
  onConfirmingChange,
  onRegenerated,
}: {
  focusTitle: boolean;
  confirming: boolean;
  /** Another 2FA change is waiting for the server: none may start until it answers. */
  locked: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  onConfirmingChange: (open: boolean) => void;
  onRegenerated: (codes: string[]) => void;
}) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>(focusTitle);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();

  return (
    <Card>
      <CardHeader>
        <CardTitle ref={titleRef} tabIndex={-1}>
          Códigos de respaldo
        </CardTitle>
        <CardDescription>
          Si pierdes acceso a tu aplicación de autenticación, entras con uno de estos códigos. Cada
          uno sirve una sola vez.
        </CardDescription>
      </CardHeader>
      {confirming ? (
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Los códigos anteriores dejarán de funcionar. Confirma tu contraseña para generar los
            nuevos.
          </p>
          <PasswordConfirm
            onSubmittingChange={onSubmittingChange}
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
              await queryClient.resetQueries({ queryKey: backupCodeCountQuery.queryKey });
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
          <CardContent className="flex flex-col gap-4">
            <BackupCodesLeft />
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
              disabled={locked}
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
  locked,
  onSubmittingChange,
  staff,
  onConfirmingChange,
  onDisabled,
}: {
  confirming: boolean;
  /** Another 2FA change is waiting for the server: none may start until it answers. */
  locked: boolean;
  onSubmittingChange: (submitting: boolean) => void;
  staff: boolean;
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
          Tu cuenta quedará protegida solo por la contraseña.
          {staff && " También perderás el acceso a la administración de Cetus."}
        </p>
      </div>
      {confirming ? (
        <PasswordConfirm
          onSubmittingChange={onSubmittingChange}
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
            disabled={locked}
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
  onSubmittingChange,
}: {
  id: string;
  submitLabel: string;
  destructive?: boolean;
  onConfirm: (password: string) => Promise<string | null>;
  onCancel: () => void;
  onSubmittingChange: (submitting: boolean) => void;
}) {
  const form = useForm({
    resolver: arktypeResolver(enableTwoFactorSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    onSubmittingChange(isSubmitting);
    return () => onSubmittingChange(false);
  }, [isSubmitting, onSubmittingChange]);

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
