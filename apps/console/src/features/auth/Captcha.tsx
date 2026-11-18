import * as Sentry from "@sentry/tanstackstart-react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldError } from "~/components/ui/field";
import { useTheme } from "~/features/theme/theme";

import type { AuthError } from "./errors";
import { getCaptchaSiteKey } from "./server";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  theme: "light" | "dark";
  language: string;
  size: "flexible";
  "response-field": false;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string | undefined;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** The header Better Auth's captcha plugin reads. */
const captchaHeader = "x-captcha-response";

let turnstileLoading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  turnstileLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.addEventListener("load", () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile's script loaded without its API")),
    );
    script.addEventListener("error", () => {
      script.remove();
      turnstileLoading = null;
      reject(new Error("Could not load Turnstile's script"));
    });
    document.head.append(script);
  });
  return turnstileLoading;
}

const captchaSiteKeyQuery = queryOptions({
  queryKey: ["captcha", "site-key"],
  queryFn: () => getCaptchaSiteKey(),
  staleTime: Infinity,
});

/**
 * Cloudflare Turnstile for the forms Better Auth's captcha plugin guards. A token is good for one request,
 * so every attempt, whatever its answer, ends with `settle` and the widget starts over.
 */
export function useCaptcha(): {
  widget: ReactNode;
  /** The request's headers, or `null` (and a prompt under the widget) while there is no token yet. */
  headers: () => Record<string, string> | null;
  settle: (error?: AuthError | null) => void;
} {
  const siteKeyQuery = useQuery(captchaSiteKeyQuery);
  const siteKey = siteKeyQuery.data;
  const theme = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [missing, setMissing] = useState(false);

  const widget = (
    <Field data-invalid={missing && !token}>
      {siteKeyQuery.isError && (
        <FieldError>
          No pudimos cargar la verificación de seguridad.{" "}
          <Button
            type="button"
            variant="link"
            // oxlint-disable-next-line shadcn/no-restyle -- a text link inside the message, without a button's box
            className="h-auto p-0"
            disabled={siteKeyQuery.isFetching}
            onClick={() => void siteKeyQuery.refetch()}
          >
            Reintentar
          </Button>
        </FieldError>
      )}
      {siteKey && theme && (
        <TurnstileWidget
          key={`${round}-${theme}`}
          siteKey={siteKey}
          theme={theme}
          solved={token !== null}
          onToken={setToken}
        />
      )}
      {missing && !token && <FieldError>Completa la verificación para continuar.</FieldError>}
    </Field>
  );

  return {
    widget,
    headers: () => {
      if (!token) {
        setMissing(true);
        return null;
      }
      return { [captchaHeader]: token };
    },
    settle: (error) => {
      if (error?.code === "UNKNOWN_ERROR") {
        Sentry.captureMessage("Turnstile could not verify a token", "error");
      }
      setToken(null);
      setMissing(false);
      setRound((current) => current + 1);
    },
  };
}

function TurnstileWidget({
  siteKey,
  theme,
  solved,
  onToken,
}: {
  siteKey: string;
  theme: "light" | "dark";
  solved: boolean;
  onToken: (token: string | null) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    let widgetId: string | undefined;
    void (async () => {
      let turnstile: TurnstileApi;
      try {
        turnstile = await loadTurnstile();
      } catch (error) {
        console.warn("Turnstile is unavailable", error);
        if (active) {
          setUnavailable(true);
        }
        return;
      }
      if (!active || !container.current) {
        return;
      }
      widgetId = turnstile.render(container.current, {
        sitekey: siteKey,
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
        theme,
        language: "es",
        size: "flexible",
        "response-field": false,
      });
    })();
    return () => {
      active = false;
      onToken(null);
      if (widgetId !== undefined) {
        window.turnstile?.remove(widgetId);
      }
    };
  }, [siteKey, theme, onToken]);

  if (unavailable) {
    return (
      <FieldError>
        No pudimos cargar la verificación de seguridad. Revisa tu conexión o desactiva el bloqueador
        de contenido y recarga la página.
      </FieldError>
    );
  }
  return (
    <div ref={container} data-captcha={solved ? "solved" : "pending"} className="min-h-16.25" />
  );
}
