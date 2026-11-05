export type FaqItem = { question: string; answer: string };

/** Each answer states only what Cetus does today; the docs hold the details. */
export const landingFaq: readonly FaqItem[] = [
  {
    question: "¿Necesito certificado digital?",
    answer:
      "Para la simulación, no: Cetus firma con un certificado propio. Para la habilitación y la producción, sí: el archivo .p12 o .pfx a nombre de tu empresa, de una entidad acreditada por la ONAC como Certicámara, GSE o Andes SCD.",
  },
  {
    question: "¿Cómo es la habilitación ante la DIAN?",
    answer:
      "Registras a Cetus como tu software en el portal de la DIAN y envías el set de pruebas desde la consola, que te guía paso a paso. Con la habilitación lista y tu resolución de numeración, emites en producción.",
  },
  {
    question: "¿Sirve para persona natural?",
    answer:
      "Sí. El emisor puede ser una persona natural o jurídica con su RUT y un certificado de firma a su nombre.",
  },
  {
    question: "¿Necesito saber programar?",
    answer:
      "No. Desde la consola emites facturas, notas crédito y notas débito con un formulario. La API es para cuando quieres que tu sistema o tu tienda facturen solos.",
  },
  {
    question: "¿Qué pasa si supero mi plan?",
    answer:
      "Con una suscripción sigues emitiendo y cada documento adicional se cobra al precio de excedente de tu plan, hasta un límite que tú puedes ampliar. Con un paquete anual tienes un margen de cortesía y luego compras una recarga.",
  },
  {
    question: "¿Qué pasa con los documentos que no uso?",
    answer:
      "En una suscripción, siguen vigentes hasta 60 días después de que termina el periodo, sin pasar de dos mensualidades de documentos acumulados. En un paquete anual, duran toda su vigencia.",
  },
  {
    question: "¿Qué documentos se cobran?",
    answer:
      "Solo las facturas, notas crédito y notas débito de producción que la DIAN acepta. La simulación, las pruebas de habilitación y los documentos rechazados no consumen nada. Las notas crédito se emiten siempre, aunque no tengas saldo.",
  },
  {
    question: "¿Mis documentos son míos?",
    answer:
      "Sí. De cada documento descargas el PDF, el XML firmado y el AttachedDocument cuando quieras, desde la consola o con la API.",
  },
];

/** schema.org FAQPage, for the head of the page that lists the questions. */
export function faqJsonLd(items: readonly FaqItem[]) {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });
}
