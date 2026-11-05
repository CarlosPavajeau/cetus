import { cn } from "cn";
import { CircleCheckIcon, CircleHelpIcon, FileCheck2Icon, type LucideIcon } from "lucide-react";
import { useId, useRef, useState } from "react";

import { ChoiceField } from "~/components/ChoiceField";
import { Field, FieldLabel, FieldTitle } from "~/components/ui/field";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import type { ObligationAnswer, ObligationCap } from "~/lib/api/types";

import { track } from "./analytics";
import { ConsoleCta } from "./ConsoleCta";
import { LeadContactForm } from "./LeadContactForm";
import {
  type NaturalPersonQuestion,
  type ObligationAnswers,
  type ObligationVerdict,
  assessObligation,
  capLabel,
  naturalPersonQuestions,
} from "./obligation";
import { sendCalculatorLead } from "./server";

type PersonType = ObligationAnswers["personType"];

const personTypes = [
  {
    value: "NATURAL_PERSON",
    title: "Persona natural",
    description: "Trabajas a tu nombre: comercio, oficio o profesión independiente.",
  },
  {
    value: "LEGAL_ENTITY",
    title: "Persona jurídica",
    description: "Una sociedad o entidad: SAS, Ltda., fundación o cooperativa.",
  },
] as const satisfies readonly { value: PersonType; title: string; description: string }[];

const answerOptions = [
  { value: "YES", label: "Sí" },
  { value: "NO", label: "No" },
  { value: "UNKNOWN", label: "No sé" },
] as const satisfies readonly { value: ObligationAnswer; label: string }[];

const questions: Record<NaturalPersonQuestion, (cap: string) => string> = {
  simpleRegime: () => "¿Estás inscrito en el Régimen Simple de Tributación (SIMPLE)?",
  incomeOverCap: (cap) => `¿Tus ingresos brutos del año pasado o de este año llegan a ${cap}?`,
  severalEstablishments: () => "¿Tienes más de un establecimiento de comercio, oficina o local?",
  otherConditions: (cap) =>
    `¿Tienes franquicias o concesiones, eres usuario aduanero, o tus contratos o consignaciones del año llegan a ${cap}?`,
};

/** Why a "Sí" obligates, or what a "No sé" leaves open, in the result's words. */
const reasons: Record<NaturalPersonQuestion, { yes: string; unknown: string }> = {
  simpleRegime: {
    yes: "Quienes están en el régimen SIMPLE deben facturar electrónicamente.",
    unknown: "Si estás en el régimen SIMPLE: aparece en la responsabilidad 47 de tu RUT.",
  },
  incomeOverCap: {
    yes: "Tus ingresos llegan al tope de los no responsables de IVA.",
    unknown: "Si tus ingresos brutos llegan al tope.",
  },
  severalEstablishments: {
    yes: "Con más de un establecimiento eres responsable de IVA.",
    unknown: "Cuántos establecimientos tienes registrados.",
  },
  otherConditions: {
    yes: "Esa condición te hace responsable de IVA.",
    unknown:
      "Si tienes franquicias, operaciones aduaneras, o contratos o consignaciones por encima del tope.",
  },
};

type VerdictTone = { icon: LucideIcon; surface: string; iconTone: string };

/** Obligated is the call to act, not an alarm; review is what still needs an answer. */
const verdictTones: Record<ObligationVerdict, VerdictTone> = {
  OBLIGATED: {
    icon: FileCheck2Icon,
    surface: "border-info/40 bg-info/10",
    iconTone: "text-info-foreground",
  },
  NOT_OBLIGATED: {
    icon: CircleCheckIcon,
    surface: "border-success/40 bg-success/10",
    iconTone: "text-success-foreground",
  },
  REVIEW: {
    icon: CircleHelpIcon,
    surface: "border-warning/50 bg-warning/10",
    iconTone: "text-warning-foreground",
  },
};

const verdicts: Record<ObligationVerdict, { title: string; text: string }> = {
  OBLIGATED: {
    title: "Debes facturar electrónicamente",
    text: "Según tus respuestas, estás obligado a expedir factura electrónica de venta.",
  },
  NOT_OBLIGATED: {
    title: "No estás obligado",
    text: "Según tus respuestas, no estás obligado a expedir factura electrónica. Puedes hacerlo de forma voluntaria, por ejemplo si tus clientes te la piden.",
  },
  REVIEW: {
    title: "Revísalo con tu contador",
    text: "Con tus respuestas no podemos saberlo. Te falta confirmar:",
  },
};

/** "¿Estoy obligado a facturar?": a few questions, the result on screen, and the option to receive it. */
export function ObligationCalculator({ cap }: { cap: ObligationCap | null }) {
  const [personType, setPersonType] = useState<PersonType | null>(null);
  const [natural, setNatural] = useState<Partial<Record<NaturalPersonQuestion, ObligationAnswer>>>(
    {},
  );
  const tracked = useRef<string | null>(null);
  const capText = capLabel(cap);
  const answers = completeAnswers(personType, natural);
  const verdict = answers ? assessObligation(answers) : null;

  function measure(next: ObligationAnswers | null) {
    if (!next) {
      return;
    }
    const nextVerdict = assessObligation(next);
    const key = JSON.stringify(next);
    if (tracked.current !== key) {
      tracked.current = key;
      track({ name: "calculator_completed", verdict: nextVerdict });
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-5">
      <div className="flex flex-col gap-8 lg:col-span-3">
        <ChoiceField
          label="¿Cómo estás inscrito en el RUT?"
          options={personTypes}
          value={personType}
          onChange={(next) => {
            setPersonType(next);
            measure(completeAnswers(next, natural));
          }}
          className="sm:grid-cols-2"
        />
        {personType === "NATURAL_PERSON" &&
          naturalPersonQuestions.map((question) => (
            <AnswerField
              key={question}
              label={questions[question](capText)}
              hint={
                question === "incomeOverCap" && cap === null
                  ? "La UVT (unidad de valor tributario) es el valor en pesos con el que la DIAN fija sus topes; cambia cada año. Multiplica 3.500 por la UVT de este año, que la DIAN publica en dian.gov.co."
                  : undefined
              }
              value={natural[question] ?? null}
              onChange={(value) => {
                const next = { ...natural, [question]: value };
                setNatural(next);
                measure(completeAnswers(personType, next));
              }}
            />
          ))}
      </div>
      <div aria-live="polite" className="lg:col-span-2">
        {answers && verdict ? (
          <Result answers={answers} verdict={verdict} />
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-md/6 text-pretty text-muted-foreground">
            Responde las preguntas y aquí verás si debes facturar electrónicamente.
          </p>
        )}
      </div>
    </div>
  );
}

function completeAnswers(
  personType: PersonType | null,
  natural: Partial<Record<NaturalPersonQuestion, ObligationAnswer>>,
): ObligationAnswers | null {
  if (personType === "LEGAL_ENTITY") {
    return { personType };
  }
  const { simpleRegime, incomeOverCap, severalEstablishments, otherConditions } = natural;
  if (
    personType === null ||
    simpleRegime === undefined ||
    incomeOverCap === undefined ||
    severalEstablishments === undefined ||
    otherConditions === undefined
  ) {
    return null;
  }
  return { personType, simpleRegime, incomeOverCap, severalEstablishments, otherConditions };
}

function Result({ answers, verdict }: { answers: ObligationAnswers; verdict: ObligationVerdict }) {
  const details = resultDetails(answers, verdict);
  const { icon: Icon, surface, iconTone } = verdictTones[verdict];
  return (
    <div className="flex flex-col gap-6 rounded-xl border p-6">
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "-mx-6 -mt-6 mb-2 flex items-start gap-3 rounded-t-xl border-b p-6",
            surface,
          )}
        >
          <Icon className={cn("mt-1 size-6 shrink-0", iconTone)} />
          <h2 className="font-heading text-2xl font-medium tracking-heading text-balance">
            {verdicts[verdict].title}
          </h2>
        </div>
        <p className="text-md/6 text-pretty text-muted-foreground">{verdicts[verdict].text}</p>
        {details.length > 0 && (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-md/6 text-pretty">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          Es una guía orientativa con las reglas generales de la DIAN; confírmalo con tu contador.
        </p>
      </div>
      <div>
        <ConsoleCta
          audience="negocio"
          section="calculator"
          label="Empezar gratis"
          size="default"
          variant={verdict === "NOT_OBLIGATED" ? "outline" : "default"}
        />
      </div>
      <LeadContactForm
        key={JSON.stringify(answers)}
        title="Recibe el resultado por correo"
        submitLabel="Enviarme el resultado"
        purpose="enviarme este resultado"
        kind="calculator"
        onSubmit={(contact) => sendCalculatorLead({ data: { ...contact, answers } })}
        sent={(email) => `Te enviamos el resultado a ${email}.`}
      />
    </div>
  );
}

function resultDetails(answers: ObligationAnswers, verdict: ObligationVerdict): string[] {
  if (answers.personType === "LEGAL_ENTITY") {
    return ["Las personas jurídicas deben facturar electrónicamente."];
  }
  if (verdict === "OBLIGATED") {
    return naturalPersonQuestions
      .filter((question) => answers[question] === "YES")
      .map((question) => reasons[question].yes);
  }
  if (verdict === "REVIEW") {
    return naturalPersonQuestions
      .filter((question) => answers[question] === "UNKNOWN")
      .map((question) => reasons[question].unknown);
  }
  return [];
}

function AnswerField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string | undefined;
  value: ObligationAnswer | null;
  onChange: (value: ObligationAnswer) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={id} className="text-sm leading-snug font-medium text-pretty">
        {label}
      </p>
      {hint !== undefined && (
        <p id={`${id}-hint`} className="max-w-prose text-sm text-pretty text-muted-foreground">
          {hint}
        </p>
      )}
      <RadioGroup
        aria-labelledby={id}
        aria-describedby={hint === undefined ? undefined : `${id}-hint`}
        value={value}
        onValueChange={(next) => {
          const option = answerOptions.find((each) => each.value === next);
          if (option) {
            onChange(option.value);
          }
        }}
        className="grid-cols-3"
      >
        {answerOptions.map((option) => (
          <FieldLabel key={option.value} htmlFor={`${id}-${option.value}`}>
            <Field orientation="horizontal" size="sm">
              <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
              <FieldTitle>{option.label}</FieldTitle>
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </div>
  );
}
