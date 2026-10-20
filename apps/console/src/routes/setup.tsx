import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowUpRightIcon, BookOpenIcon, CircleHelpIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { issuerDetailQuery, issuersQuery } from "~/features/issuers/queries";
import { requireSession } from "~/features/session/guard";
import { CertificateStep } from "~/features/setup/CertificateStep";
import { IssuerStep } from "~/features/setup/IssuerStep";
import { NumberingStep } from "~/features/setup/NumberingStep";
import { SetupProgress } from "~/features/setup/SetupProgress";
import { SoftwareStep } from "~/features/setup/SoftwareStep";
import { type Step, completedSteps, firstIncompleteStep } from "~/features/setup/steps";
import type { IssuerDetail } from "~/lib/api/types";
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
    const step = Number(search.step);
    const issuerId = typeof search.issuerId === "string" ? search.issuerId : "";
    return {
      ...([1, 2, 3, 4].includes(step) && { step: step as Step }),
      ...(uuidPattern.test(issuerId)
        ? { issuerId }
        : (search.new === true || search.new === "true") && { new: true as const }),
    };
  },
  beforeLoad: requireSession,
  loaderDeps: ({ search }) => ({ issuerId: search.issuerId, new: search.new }),
  loader: async ({ context: { queryClient }, deps }) => {
    if (deps.issuerId) {
      const issuer = await queryClient.ensureQueryData(issuerDetailQuery(deps.issuerId));
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
    const issuers = await queryClient.ensureQueryData(issuersQuery);
    const pending = issuers.find((issuer) => issuer.status === "ONBOARDING");
    if (!pending && issuers.length > 0) {
      throw redirect({ to: "/issuers" });
    }
    if (pending) {
      await queryClient.ensureQueryData(issuerDetailQuery(pending.id));
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

  return issuerId ? <ResumedSetup issuerId={issuerId} /> : <SetupPage issuer={null} />;
}

function ResumedSetup({ issuerId }: { issuerId: string }) {
  const { data: issuer } = useSuspenseQuery(issuerDetailQuery(issuerId));
  return <SetupPage issuer={issuer} />;
}

const environmentLabel = { TEST: "TEST · Pruebas", LIVE: "LIVE · Producción" } as const;

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
        {/* Placeholders until the documentation and help center exist, as in the console header. */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>
            <BookOpenIcon data-icon="inline-start" />
            Documentación
            <ArrowUpRightIcon data-icon="inline-end" />
          </Button>
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
              Completa estos cuatro pasos para preparar tu emisor en Cetus: datos del emisor,
              software DIAN, certificado digital y numeración.
            </p>
          </div>
          {/* A new issuer picks its environment in the first step. */}
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
  const reachable = firstIncompleteStep(issuer);
  // A step ahead of the first missing piece cannot be filled yet.
  const step = Math.min(search.step ?? reachable, reachable) as Step;

  function goTo(next: Step, issuerId = issuer?.id) {
    return navigate({ search: { issuerId, step: next } });
  }

  function back() {
    if (step === 1) {
      // A new organization without issuers has nowhere else to go: the overview sends it back here.
      void navigate({ to: issuer || search.new ? "/issuers" : "/overview" });
    } else {
      void goTo((step - 1) as Step);
    }
  }

  /**
   * After a step is saved: on to the next one, or to the issuer's page, with the ID to integrate,
   * once it is ready.
   */
  async function saved(issuerId: string) {
    const detail = await queryClient.fetchQuery({ ...issuerDetailQuery(issuerId), staleTime: 0 });
    if (detail && detail.status !== "ONBOARDING") {
      await navigate({ to: "/issuers/$issuerId", params: { issuerId } });
      await queryClient.invalidateQueries({ queryKey: ["issuers"] });
      return;
    }
    if (!issuer) {
      await queryClient.invalidateQueries({ queryKey: issuersQuery.queryKey, exact: true });
    }
    // The URL names the issuer from now on, so a reload resumes this one and not another.
    await goTo(Math.min(step + 1, 4) as Step, issuerId);
  }

  return (
    <div className="flex flex-1 flex-col gap-2.5">
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
