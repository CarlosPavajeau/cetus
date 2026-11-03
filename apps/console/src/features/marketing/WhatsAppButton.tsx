import { MessageCircleIcon } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";

import { whatsappUrl } from "./links";

/** Renders nothing until CETUS_WHATSAPP_NUMBER is set. */
export function WhatsAppButton({
  number,
  variant = "outline",
}: {
  number: string | null;
  variant?: "outline" | "default";
}) {
  if (number === null) {
    return null;
  }
  return (
    <a
      href={whatsappUrl(number)}
      target="_blank"
      rel="noreferrer"
      className={buttonVariants({ variant, size: "lg" })}
    >
      <MessageCircleIcon data-icon="inline-start" />
      Hablar por WhatsApp
    </a>
  );
}

/** Floating on phones, where most visitors from ads arrive and a chat is one tap away. */
export function WhatsAppFloat({ number }: { number: string | null }) {
  if (number === null) {
    return null;
  }
  return (
    <a
      href={whatsappUrl(number)}
      target="_blank"
      rel="noreferrer"
      aria-label="Hablar por WhatsApp"
      className="fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center rounded-full bg-success text-primary-foreground shadow-lg md:hidden dark:text-background"
    >
      <MessageCircleIcon className="size-6" />
    </a>
  );
}
