import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";

import type { FaqItem } from "./questions";
import { Section } from "./Section";

export function FaqSection({ items }: { items: readonly FaqItem[] }) {
  return (
    <Section eyebrow="Preguntas frecuentes" title="Lo que suelen preguntarnos">
      <Accordion className="max-w-3xl">
        {items.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  );
}
