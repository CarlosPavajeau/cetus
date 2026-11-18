import * as Sentry from "@sentry/tanstackstart-react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldError } from "~/components/ui/field";
import { type Theme, useTheme } from "~/features/theme/theme";

import type { AuthError } from "./errors";
import { getCaptchaSiteKey } from "./server";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
  theme: Theme;
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

const captchaHeader = "x-captcha-response";

let turnstilePromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  turnstilePromise ??= new Promise((resolve, reject) => {
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
      turnstilePromise = null;
      reject(new Error("Could not load Turnstile's script"));
    });
    document.head.append(script);
  });
  return turnstilePromise;
}

const captchaSiteKeyQuery = queryOptions({
  queryKey: ["captcha", "site-key"],
  queryFn: () => getCaptchaSiteKey(),
  staleTime: Infinity,
});

/** Sends a request guarded by Better Auth's captcha plugin; `null` when there was no token to send. */
export type CaptchaRun = <T extends { error: AuthError | null }>(
  request: (headers: Record<string, string>) => Promise<T>,
) => Promise<T | null>;

/**
 * Cloudflare Turnstile for the forms Better Auth's captcha plugin guards. A token is good for one request,
 * so every attempt, whatever its answer, starts the widget over.
 */
export function useCaptcha(): { widget: ReactNode; run: CaptchaRun } {
  const siteKeyQuery = useQuery(captchaSiteKeyQuery);
  const siteKey = siteKeyQuery.data;
  const theme = useTheme();
  const [token, setToken] = useState<string | null>(null);
  const [widgetGeneration, setWidgetGeneration] = useState(0);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  function restartWidget() {
    setToken(null);
    setTokenMissing(false);
    setWidgetGeneration((current) => current + 1);
  }

  const widget = (
    <Field data-invalid={tokenMissing && !token}>
      {siteKeyQuery.isError && (
        <LoadError retrying={siteKeyQuery.isFetching} onRetry={() => void siteKeyQuery.refetch()} />
      )}
      {scriptFailed && (
        <LoadError
          retrying={false}
          onRetry={() => {
            setScriptFailed(false);
            restartWidget();
          }}
        />
      )}
      {siteKey && theme && !scriptFailed && (
        <TurnstileWidget
          key={`${widgetGeneration}-${theme}`}
          siteKey={siteKey}
          theme={theme}
          solved={token !== null}
          onToken={setToken}
          onScriptFailed={setScriptFailed}
        />
      )}
      {tokenMissing && !token && <FieldError>Completa la verificación para continuar.</FieldError>}
    </Field>
  );

  const run: CaptchaRun = async (request) => {
    if (!token) {
      setTokenMissing(true);
      return null;
    }
    const response = await request({ [captchaHeader]: token });
    if (response.error?.code === "UNKNOWN_ERROR") {
      Sentry.captureMessage("Turnstile could not verify a token", "error");
    }
    restartWidget();
    return response;
  };

  return { widget, run };
}

function LoadError({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <FieldError>
      No pudimos cargar la verificación de seguridad. Revisa tu conexión o el bloqueador de
      contenido.{" "}
      <Button
        type="button"
        variant="link"
        // oxlint-disable-next-line shadcn/no-restyle -- a text link inside the message, without a button's box
        className="h-auto p-0"
        disabled={retrying}
        onClick={onRetry}
      >
        Reintentar
      </Button>
    </FieldError>
  );
}

function TurnstileWidget({
  siteKey,
  theme,
  solved,
  onToken,
  onScriptFailed,
}: {
  siteKey: string;
  theme: Theme;
  solved: boolean;
  onToken: (token: string | null) => void;
  onScriptFailed: (failed: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);

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
          onScriptFailed(true);
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
  }, [siteKey, theme, onToken, onScriptFailed]);

  return (
    <div ref={container} data-captcha={solved ? "solved" : "pending"} className="min-h-16.25" />
  );
}
