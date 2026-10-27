import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowUpRightIcon, BookOpenIcon, CircleHelpIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "~/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button, buttonVariants } from "~/components/ui/button";
import { ImpersonationBanner } from "~/features/admin/ImpersonationBanner";
import { issuerDetailQuery, issuersQuery } from "~/features/issuers/queries";
import { requireManager } from "~/features/session/guard";
import { CertificateStep } from "~/features/setup/CertificateStep";
import { IssuerStep } from "~/features/setup/IssuerStep";
import { NumberingStep } from "~/features/setup/NumberingStep";
import { SetupProgress } from "~/features/setup/SetupProgress";
import { SoftwareStep } from "~/features/setup/SoftwareStep";
import {
  type Step,
  clampStep,
  completedSteps,
  firstIncompleteStep,
  steps,
} from "~/features/setup/steps";
import { Welcome } from "~/features/setup/Welcome";
import type { IssuerDetail } from "~/lib/api/types";
import { docsUrl } from "~/lib/docs";
import { uuidPattern } from "~/lib/utils";

type SetupSearch = { step?: Step; issuerId?: string; new?: true };

/**
 * The setup assistant: tax data, DIAN software, certificate and numbering of an issuer. Each step
 * is saved as soon as the person continues, so it can be left and resumed at the first step still
 * missing. `?issuerId=` resumes that issuer and `?new` starts another one; with neither, it resumes
 * the organization's first issuer still being set up, which is how a new organization starts.
 */
export const Route = createFileRoute("/setup")({
  validateSearch: (search): SetupSearch => {
    const step = steps.find((each) => each.number === Number(search.step))?.number;
    const issuerId = typeof search.issuerId === "string" ? search.issuerId : "";
    return {
      ...(step && { step }),
      ...(uuidPattern.test(issuerId)
        ? { issuerId }
        : (search.new === true || search.new === "true") && { new: true as const }),
    };
  },
  beforeLoad: requireManager,
  loaderDeps: ({ search }) => ({ issuerId: search.issuerId, new: search.new }),
  loader: async ({ context: { queryClient }, deps }) => {
    if (deps.issuerId) {
      const issuer = await queryClient.query({
        ...issuerDetailQuery(deps.issuerId),
        staleTime: "static",
      });
      if (!issuer) {
        throw redirect({ to: "/issuers" });
      }
      // Once it is in habilitación or production there is nothing left to set up here.
      if (issuer.status !== "ONBOARDING") {
        throw redirect({ to: "/issuers/$issuerId", params: { issuerId: issuer.id } });
      }
      return;
    }
    if (deps.new) {
      return;
    }
    const issuers = await queryClient.query({ ...issuersQuery, staleTime: "static" });
    const pending = issuers.find((issuer) => issuer.status === "ONBOARDING");
    // The sandbox sample needs no setup: an organization with only that one starts a new issuer here.
    if (!pending && issuers.some((issuer) => issuer.environment !== "SANDBOX")) {
      throw redirect({ to: "/issuers" });
    }
    if (pending) {
      await queryClient.query({ ...issuerDetailQuery(pending.id), staleTime: "static" });
    }
  },
  component: Setup,
});

function Setup() {
  const search = Route.useSearch();
  const { data: issuers } = useQuery({ ...issuersQuery, enabled: !search.issuerId && !search.new });
  const issuerId =
    search.issuerId ??
    (search.new ? undefined : issuers?.find((issuer) => issuer.status === "ONBOARDING")?.id);

  return (
    <>
      <ImpersonationBanner />
      {issuerId ? <ResumedSetup issuerId={issuerId} /> : <SetupPage issuer={null} />}
    </>
  );
}

function ResumedSetup({ issuerId }: { issuerId: string }) {
  const { data: issuer } = useSuspenseQuery(issuerDetailQuery(issuerId));
  return <SetupPage issuer={issuer} />;
}

const environmentLabel = {
  TEST: "Habilitación",
  LIVE: "Producción",
  SANDBOX: "Simulación",
} as const;

function SetupPage({ issuer }: { issuer: IssuerDetail | null }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-10">
        <Breadcrumb>
          <BreadcrumbList className="gap-3 text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/issuers" />}>Emisores</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Facturación electrónica</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-2">
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <BookOpenIcon data-icon="inline-start" />
            Documentación
            <ArrowUpRightIcon data-icon="inline-end" />
          </a>
          {/* Placeholder until the help center exists, as in the console header. */}
          <Button variant="ghost" size="icon-sm" disabled>
            <CircleHelpIcon />
            <span className="sr-only">Ayuda</span>
          </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-7 px-4 pt-9 pb-6 md:px-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-normal tracking-tight">
              Configura tu facturación electrónica
            </h1>
            <p className="text-sm text-muted-foreground">
              {issuer
                ? `${issuer.legalName} · NIT ${issuer.nit}-${issuer.checkDigit}`
                : "Prepara tu emisor para facturar electrónicamente ante la DIAN."}
            </p>
          </div>
          {issuer && (
            <Badge variant="outline" className="text-muted-foreground">
              {environmentLabel[issuer.environment]}
            </Badge>
          )}
        </div>
        <Assistant issuer={issuer} />
      </main>
    </div>
  );
}

function Assistant({ issuer }: { issuer: IssuerDetail | null }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [started, setStarted] = useState(false);
  const reachable = firstIncompleteStep(issuer);
  // A step ahead of the first missing piece cannot be filled yet.
  const step = clampStep(Math.min(search.step ?? reachable, reachable));

  function goTo(next: Step, issuerId = issuer?.id) {
    return navigate({ search: { issuerId, step: next } });
  }

  function exit() {
    // A new organization without issuers has nowhere else to go: the overview sends it back here.
    void navigate({ to: issuer || search.new ? "/issuers" : "/overview" });
  }

  function back() {
    if (step === 1) {
      exit();
    } else {
      void goTo(clampStep(step - 1));
    }
  }

  /**
   * After a step is saved: on to the next one, or to the issuer's page, with the ID to integrate,
   * once it is ready.
   */
  async function saved(issuerId: string) {
    const detail = await queryClient.query({ ...issuerDetailQuery(issuerId), staleTime: 0 });
    if (detail && detail.status !== "ONBOARDING") {
      await navigate({ to: "/issuers/$issuerId", params: { issuerId } });
      await queryClient.invalidateQueries({ queryKey: ["issuers"] });
      return;
    }
    if (!issuer) {
      await queryClient.invalidateQueries({ queryKey: issuersQuery.queryKey, exact: true });
    }
    // The URL names the issuer from now on, so a reload resumes this one and not another.
    await goTo(clampStep(step + 1), issuerId);
  }

  if (!issuer && !started) {
    return <Welcome onStart={() => setStarted(true)} onExit={exit} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SetupProgress current={step} completed={completedSteps(issuer)} reachable={reachable} />
      {step === 1 || !issuer ? (
        <IssuerStep key={issuer?.id ?? "new"} issuer={issuer} onBack={back} onSaved={saved} />
      ) : step === 2 ? (
        <SoftwareStep issuer={issuer} onBack={back} onSaved={() => saved(issuer.id)} />
      ) : step === 3 ? (
        <CertificateStep issuer={issuer} onBack={back} onSaved={() => saved(issuer.id)} />
      ) : (
        <NumberingStep issuer={issuer} onBack={back} onSaved={() => saved(issuer.id)} />
      )}
    </div>
  );
}
