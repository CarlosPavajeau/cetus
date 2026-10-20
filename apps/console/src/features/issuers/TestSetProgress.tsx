import { CircleCheckIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { dateFormat } from "~/features/api-keys/formats";
import type { TestSetProgress as Progress } from "~/lib/api/types";
import { cn } from "~/lib/utils";

import { documentTypeLabel } from "./labels";

const countFormat = new Intl.NumberFormat("es-CO");

function Count({ value, className }: { value: number; className?: string }) {
  return (
    <TableCell className={cn("text-2xs tabular-nums", className)}>
      {value === 0 ? <span className="text-muted-foreground">0</span> : countFormat.format(value)}
    </TableCell>
  );
}

/**
 * What Cetus sent to the issuer's current test set. The DIAN portal is the one that says how many
 * documents of each type the set asks for and when habilitación is done, so this is what to compare
 * against it, not a verdict.
 */
export function TestSetProgress({ testSet }: { testSet: Progress }) {
  return (
    <div className="flex flex-col gap-3" data-testid="test-set-progress">
      {testSet.acceptedAt && (
        <Alert data-testid="test-set-accepted">
          <CircleCheckIcon />
          <AlertTitle>
            La DIAN aceptó este set de pruebas el {dateFormat.format(new Date(testSet.acceptedAt))}
          </AlertTitle>
          <AlertDescription>
            La habilitación terminó y el set ya no recibe más documentos. Las facturas de prueba de
            este emisor se siguen validando en habilitación, ahora fuera del set. Cuando tengas la
            resolución, pasa a producción y factura con una llave de producción.
          </AlertDescription>
        </Alert>
      )}
      <p className="text-2xs text-muted-foreground">
        Documentos enviados al set de pruebas desde el {dateFormat.format(new Date(testSet.since))}.
        Compáralos con lo que pide el set en el portal de habilitación de la DIAN: allí se ve
        cuántos documentos de cada tipo debe aceptar y cuándo queda habilitado. Cetus todavía no
        emite notas crédito ni débito.
      </p>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-sidebar [&_th]:h-8.75">
            <TableRow>
              <TableHead className="pl-4">Tipo de documento</TableHead>
              <TableHead>Aceptados</TableHead>
              <TableHead>Rechazados</TableHead>
              <TableHead>En proceso</TableHead>
              <TableHead className="pr-4">Sin enviar por error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testSet.documents.map((row) => (
              <TableRow key={row.documentType}>
                <TableCell className="pl-4 text-2xs font-medium">
                  {documentTypeLabel[row.documentType]}
                </TableCell>
                <Count value={row.accepted} />
                <Count value={row.rejected} />
                <Count value={row.inProgress} />
                <Count value={row.failed} className="pr-4" />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
