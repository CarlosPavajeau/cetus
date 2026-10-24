import { PencilIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

/** An entry saved with what the form cannot show: editing it here would lose data. */
export function EditUnavailable({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="w-fit" />}>
        <Button variant="ghost" size="icon-sm" disabled>
          <PencilIcon />
          <span className="sr-only">Editar {label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">
        Tiene datos que este formulario no muestra: edítalo por API.
      </TooltipContent>
    </Tooltip>
  );
}
