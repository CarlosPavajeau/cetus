import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Spinner } from "~/components/ui/spinner";
import { auditLogKey } from "~/features/audit-log/queries";

import { type NoteRangeValues, noteRangeSchema } from "./noteRangeSchema";
import { addNoteRange } from "./server";

type NoteType = NoteRangeValues["documentType"];

const typeItems: { label: string; value: NoteType }[] = [
  { label: "Nota crédito", value: "CREDIT_NOTE" },
  { label: "Nota débito", value: "DEBIT_NOTE" },
];

const defaultPrefix: Record<NoteType, string> = { CREDIT_NOTE: "NC", DEBIT_NOTE: "ND" };

function defaults(documentType: NoteType): NoteRangeValues {
  return { documentType, prefix: defaultPrefix[documentType], from: "1", to: "99999999" };
}

/**
 * Adds the range credit or debit notes are numbered from. Notes need no DIAN resolution: only a prefix
 * of their own and consecutive numbers. Invoice ranges stay in the assistant.
 */
export function AddNoteRange({
  issuerId,
  initialType = "CREDIT_NOTE",
}: {
  issuerId: string;
  initialType?: NoteType;
}) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const add = useMutation({
    mutationFn: addNoteRange,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["issuers"] }),
        queryClient.invalidateQueries({ queryKey: auditLogKey }),
      ]),
  });
  const form = useForm({
    resolver: arktypeResolver(noteRangeSchema),
    defaultValues: defaults(initialType),
  });
  const { isSubmitting } = form.formState;

  const onAdd = form.handleSubmit(async (values) => {
    try {
      await add.mutateAsync({ data: { id: issuerId, range: values } });
      setOpen(false);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "No pudimos agregar el rango.",
      });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          form.reset(defaults(initialType));
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon data-icon="inline-start" />
        Rango de notas
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onAdd} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Nuevo rango de notas</DialogTitle>
            <DialogDescription>
              Las notas crédito y débito no necesitan resolución de la DIAN: solo un prefijo propio
              y su consecutivo.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="documentType"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="note-range-type">Tipo de documento</FieldLabel>
                  <Select
                    items={typeItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => {
                      const next = typeItems.find((item) => item.value === value)?.value;
                      if (!next) {
                        return;
                      }
                      field.onChange(next);
                      // Keep the suggested prefix in step with the type unless the person changed it.
                      if (!form.getFieldState("prefix").isDirty) {
                        form.setValue("prefix", defaultPrefix[next]);
                      }
                    }}
                  >
                    <SelectTrigger id="note-range-type" className="w-full" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {typeItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              name="prefix"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="note-range-prefix">Prefijo</FieldLabel>
                  <Input
                    {...field}
                    id="note-range-prefix"
                    maxLength={4}
                    className="uppercase"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Distinto del de las facturas, para que los números no se confundan.
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="from"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="note-range-from">Desde</FieldLabel>
                    <Input
                      {...field}
                      id="note-range-from"
                      inputMode="numeric"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="to"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="note-range-to">Hasta</FieldLabel>
                    <Input
                      {...field}
                      id="note-range-to"
                      inputMode="numeric"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={isSubmitting}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {isSubmitting ? "Agregando…" : "Agregar rango"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
