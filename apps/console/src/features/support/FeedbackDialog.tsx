import { arktypeResolver } from "@hookform/resolvers/arktype";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
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
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";

import { feedbackSchema } from "./schema";
import { sendFeedback } from "./server";

/** An idea or an opinion for the Cetus team; it needs no answer, so it opens no ticket. */
export function FeedbackDialog({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const location = useLocation();
  const send = useMutation({ mutationFn: sendFeedback });
  const form = useForm({
    resolver: arktypeResolver(feedbackSchema),
    defaultValues: { message: "" },
  });
  const { isSubmitting } = form.formState;

  const onSend = form.handleSubmit(async (values) => {
    try {
      await send.mutateAsync({ data: { ...values, page: location.pathname.slice(0, 300) } });
      setSent(true);
    } catch (error) {
      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "No pudimos enviar tu opinión. Inténtalo de nuevo.",
      });
    }
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
      setSent(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>Gracias por escribirnos</DialogTitle>
              <DialogDescription>
                El equipo de Cetus lee cada opinión. Si necesitas una respuesta, abre un caso de
                soporte.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button />}>Listo</DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={onSend} noValidate className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Comparte tu opinión</DialogTitle>
              <DialogDescription>
                Ideas, cosas que te confunden o lo que te gustaría que Cetus hiciera.
              </DialogDescription>
            </DialogHeader>
            <Controller
              name="message"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="feedback-message" className="sr-only">
                    Tu opinión
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="feedback-message"
                    rows={5}
                    className="min-h-28"
                    placeholder="Tus ideas, sugerencias o lo que no te gustó"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
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
                {isSubmitting ? "Enviando…" : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
