import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
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
import { Textarea } from "~/components/ui/textarea";
import { componentLabel, impactLabel } from "~/features/status/labels";
import type { Incident } from "~/lib/api/types";

import { incidentImpacts, incidentSchema, statusComponents } from "./incidentSchema";

type IncidentValues = typeof incidentSchema.infer;
import { openIncident, updateIncident } from "./incidents";
import { adminKey } from "./queries";

const componentItems = statusComponents.map((value) => ({ value, label: componentLabel[value] }));
const impactItems = incidentImpacts.map((value) => ({ value, label: impactLabel[value] }));

/** Publishes an incident, or edits an open one; customers see it on the status page and in the console. */
export function IncidentDialog({ incident }: { incident?: Incident }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    resolver: arktypeResolver(incidentSchema),
    defaultValues: {
      component: incident?.component ?? "DIAN_LIVE",
      impact: incident?.impact ?? "DEGRADED",
      title: incident?.title ?? "",
      message: incident?.message ?? "",
    },
  });
  const save = useMutation({
    mutationFn: (values: IncidentValues) =>
      incident
        ? updateIncident({ data: { ...values, id: incident.id } })
        : openIncident({ data: values }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adminKey });
      setOpen(false);
      if (!incident) {
        form.reset();
      }
    },
    onError: (error) => form.setError("root", { message: error.message }),
  });

  const onSubmit = form.handleSubmit((values) => save.mutate(values));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={incident ? "outline" : "default"} size={incident ? "sm" : "default"} />
        }
      >
        {incident ? "Editar" : "Publicar incidente"}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{incident ? "Editar incidente" : "Publicar incidente"}</DialogTitle>
            <DialogDescription>
              Aparece en la página de estado y en la consola de todas las cuentas hasta que lo
              resuelvas.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Controller
              name="component"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="incident-component">Componente</FieldLabel>
                  <Select
                    items={componentItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => {
                      const next = statusComponents.find((each) => each === value);
                      if (next) {
                        field.onChange(next);
                      }
                    }}
                  >
                    <SelectTrigger id="incident-component" className="w-full" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {componentItems.map((item) => (
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
              name="impact"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="incident-impact">Impacto</FieldLabel>
                  <Select
                    items={impactItems}
                    name={field.name}
                    value={field.value}
                    onValueChange={(value) => {
                      const next = incidentImpacts.find((each) => each === value);
                      if (next) {
                        field.onChange(next);
                      }
                    }}
                  >
                    <SelectTrigger id="incident-impact" className="w-full" onBlur={field.onBlur}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {impactItems.map((item) => (
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
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="incident-title">Título</FieldLabel>
                  <Input
                    {...field}
                    id="incident-title"
                    maxLength={120}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="message"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="incident-message">Mensaje</FieldLabel>
                  <Textarea
                    {...field}
                    id="incident-message"
                    rows={4}
                    maxLength={1000}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          {form.formState.errors.root && (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />} disabled={save.isPending}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Spinner data-icon="inline-start" />}
              {incident ? "Guardar" : "Publicar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
