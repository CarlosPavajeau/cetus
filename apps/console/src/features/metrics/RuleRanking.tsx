import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { explanations } from "~/features/documents/dian-errors";
import { formatCount } from "~/features/usage/labels";
import type { DianRuleKind, MetricsRule } from "~/lib/api/types";

const kinds: { kind: DianRuleKind; label: string; empty: string }[] = [
  { kind: "REJECTION", label: "Rechazos", empty: "La DIAN no rechazó documentos en este periodo." },
  {
    kind: "NOTIFICATION",
    label: "Notificaciones",
    empty: "La DIAN no dejó notificaciones en este periodo.",
  },
];

/** The DIAN rules reported most often in the period, rejections apart from notifications. */
export function RuleRanking({ rules }: { rules: MetricsRule[] }) {
  return (
    <section aria-labelledby="rule-ranking" className="flex flex-col gap-2">
      <h3 id="rule-ranking" className="text-sm font-medium">
        Reglas de la DIAN más frecuentes
      </h3>
      <Tabs defaultValue="REJECTION">
        <TabsList>
          {kinds.map((each) => (
            <TabsTrigger key={each.kind} value={each.kind}>
              {each.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {kinds.map((each) => (
          <TabsContent key={each.kind} value={each.kind}>
            <RuleTable rules={rules.filter((rule) => rule.kind === each.kind)} empty={each.empty} />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function RuleTable({ rules, empty }: { rules: MetricsRule[]; empty: string }) {
  if (rules.length === 0) {
    return <p className="py-3 text-xs text-muted-foreground">{empty}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Regla</TableHead>
          <TableHead>Qué significa</TableHead>
          <TableHead className="text-right">Documentos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => {
          const explanation = explanations[rule.rule];
          return (
            <TableRow key={rule.rule}>
              <TableCell className="font-mono">{rule.rule}</TableCell>
              <TableCell className="max-w-md whitespace-normal">
                <p>{explanation?.title ?? rule.message}</p>
                {explanation && (
                  <p className="text-2xs text-muted-foreground">{explanation.action}</p>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCount(rule.documents)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
