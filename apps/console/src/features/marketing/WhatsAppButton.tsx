import { type CtaSection, track } from "./analytics";
import { linkButtonVariants } from "./linkButton";
import { whatsappUrl } from "./links";

const whatsappIconSrc = "/images/whatsapp-icon.svg";

/** Renders nothing until CETUS_WHATSAPP_NUMBER is set. */
export function WhatsAppButton({
  number,
  section,
  variant = "outline",
}: {
  number: string | null;
  section: CtaSection;
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
      className={linkButtonVariants({ variant, size: "lg" })}
      onClick={() => track({ name: "whatsapp_click", section })}
    >
      <img src={whatsappIconSrc} alt="" data-icon="inline-start" className="size-4" />
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
      onClick={() => track({ name: "whatsapp_click", section: "float" })}
      className="fixed right-4 bottom-4 z-40 size-14 drop-shadow-lg transition-transform motion-safe:active:scale-96 md:hidden"
    >
      <img src={whatsappIconSrc} alt="" className="size-full" />
    </a>
  );
}
