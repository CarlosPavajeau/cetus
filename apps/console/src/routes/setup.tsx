import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
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
import { issuersQuery } from "~/features/issuers/queries";
import { requireSession } from "~/features/session/guard";
import { CertificateStep } from "~/features/setup/CertificateStep";
import { IssuerStep } from "~/features/setup/IssuerStep";
import { NumberingStep } from "~/features/setup/NumberingStep";
import { issuerDetailQuery } from "~/features/setup/queries";
import { SetupProgress } from "~/features/setup/SetupProgress";
import { SoftwareStep } from "~/features/setup/SoftwareStep";
import { type Step, completedSteps, firstIncompleteStep } from "~/features/setup/steps";
import type { IssuerDetail } from "~/lib/api/types";

type SetupSearch = { step?: Step };

/**
 * The setup assistant: tax data, DIAN software, certificate and numbering of the organization's
 * issuer in habilitación. Each step is saved as soon as the person continues, so it can be left
 * and resumed at the first step still missing.
 */
export const Route = createFileRoute("/setup")({
  validateSearch: (search): SetupSearch => {
    const step = Number(search.step);
    return [1, 2, 3, 4].includes(step) ? { step: step as Step } : {};
  },
  beforeLoad: requireSession,
  loader: async ({ context: { queryClient } }) => {
    const issuers = await queryClient.ensureQueryData(issuersQuery);
    const pending = issuers.find((issuer) => issuer.status === "ONBOARDING");
    // The assistant sets up the first issuer; once it is in habilitación there is nothing left here.
    if (!pending && issuers.length > 0) {
      throw redirect({ to: "/overview" });
    }
    if (pending) {
      await queryClient.ensureQueryData(issuerDetailQuery(pending.id));
    }
  },
  component: Setup,
});

function Setup() {
  const { data: issuers } = useSuspenseQuery(issuersQuery);
  const pending = issuers.find((issuer) => issuer.status === "ONBOARDING");

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4 md:px-10">
        <Breadcrumb>
          <BreadcrumbList className="gap-3 text-xs">
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link to="/overview" />}>Configuración</BreadcrumbLink>
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
          <div className="flex flex-col gap-1.5 sm:items-end">
            <Badge variant="outline" className="text-muted-foreground">
              TEST · Pruebas
            </Badge>
            <p className="text-[10px] text-muted-foreground">Asignado por la aplicación</p>
          </div>
        </div>
        {pending ? <ResumedAssistant issuerId={pending.id} /> : <Assistant issuer={null} />}
      </main>
    </div>
  );
}

function ResumedAssistant({ issuerId }: { issuerId: string }) {
  const { data: issuer } = useSuspenseQuery(issuerDetailQuery(issuerId));
  return <Assistant issuer={issuer} />;
}

function Assistant({ issuer }: { issuer: IssuerDetail | null }) {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const reachable = firstIncompleteStep(issuer);
  // A step ahead of the first missing piece cannot be filled yet.
  const step = Math.min(search.step ?? reachable, reachable) as Step;

  function goTo(next: Step) {
    return navigate({ search: { step: next } });
  }

  function back() {
    if (step === 1) {
      void navigate({ to: "/overview" });
    } else {
      void goTo((step - 1) as Step);
    }
  }

  /** After a step is saved: on to the next one, or to the overview once the issuer is ready. */
  async function saved(issuerId: string) {
    const detail = await queryClient.fetchQuery({ ...issuerDetailQuery(issuerId), staleTime: 0 });
    if (detail && detail.status !== "ONBOARDING") {
      await navigate({ to: "/overview" });
      await queryClient.invalidateQueries({ queryKey: ["issuers"] });
      return;
    }
    if (!issuer) {
      // The issuer was just created: the list now has it, and with it the assistant resumes.
      await queryClient.invalidateQueries({ queryKey: issuersQuery.queryKey, exact: true });
    }
    await goTo(Math.min(step + 1, 4) as Step);
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
