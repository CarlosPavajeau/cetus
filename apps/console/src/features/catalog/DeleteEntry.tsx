import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2Icon } from "lucide-react";

import { Button } from "~/components/ui/button";

import { catalogKey } from "./queries";

/** Removes an entry; the documents that used it keep their own copy. */
export function DeleteEntry({ label, remove }: { label: string; remove: () => Promise<void> }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogKey }),
  });
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
    >
      <Trash2Icon />
      <span className="sr-only">Eliminar {label}</span>
    </Button>
  );
}
