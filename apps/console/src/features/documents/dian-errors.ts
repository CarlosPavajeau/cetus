/**
 * The DIAN answers each failed validation rule as text: "Regla: FAJ43b, Notificación: Nombre informado…".
 * A rejection ("Rechazo") stops the document; a notification ("Notificación") does not, but points at data
 * worth fixing.
 */
export type DianErrorKind = "REJECTION" | "NOTIFICATION";

export type DianError = {
  rule: string | null;
  kind: DianErrorKind | null;
  /** The DIAN's own message, or the whole text when it does not follow the usual format. */
  message: string;
  explanation: DianRuleExplanation | null;
};

export type DianRuleExplanation = {
  /** What the rule checks, in plain words. */
  title: string;
  /** What to do about it. */
  action: string;
};

const pattern = /^Regla:\s*([^,]+?)\s*,\s*(Rechazo|Notificaci[oó]n)\s*:\s*([\s\S]*)$/i;

/**
 * The rules that show up most often, from the habilitación and the annex 1.9. Any other rule shows the
 * DIAN's message as is.
 */
export const explanations: Record<string, DianRuleExplanation> = {
  "90": {
    title: "La DIAN ya tenía registrado este documento.",
    action:
      "Un documento con el mismo CUFE o CUDE ya había sido validado. Consulta su estado en el portal de la DIAN antes de volver a emitirlo.",
  },
  FAJ43b: {
    title: "El nombre del emisor no coincide con el del RUT.",
    action:
      "Edita los datos tributarios del emisor y copia la razón social exactamente como aparece en el RUT.",
  },
  DAJ39: {
    title: "El emisor no figura como responsable de IVA.",
    action:
      "La DIAN espera el tributo 01 (IVA). Si el emisor sí es responsable de IVA, actualízalo en sus datos tributarios; si no lo es, puedes ignorar este aviso.",
  },
  CBF04: {
    title: "La descripción de la corrección no es la del concepto.",
    action:
      "La nota crédito debe llevar el nombre del concepto de corrección de la tabla 13.2.4 del anexo; el motivo libre va en las notas.",
  },
  DBF04: {
    title: "La descripción de la corrección no es la del concepto.",
    action:
      "La nota débito debe llevar el nombre del concepto de corrección de la tabla 13.2.5 del anexo; el motivo libre va en las notas.",
  },
  FAD06: {
    title: "El CUFE no corresponde a los datos de la factura.",
    action:
      "Suele deberse a una clave técnica mal registrada en el rango de numeración. Compárala con la que muestra el portal de la DIAN para la resolución.",
  },
};

export function parseDianError(text: string): DianError {
  const match = pattern.exec(text.trim());
  if (!match) {
    return { rule: null, kind: null, message: text.trim(), explanation: null };
  }
  const [, rule = "", kind = "", message = ""] = match;
  return {
    rule,
    kind: kind.toLowerCase() === "rechazo" ? "REJECTION" : "NOTIFICATION",
    message: message.trim(),
    explanation: explanations[rule] ?? null,
  };
}
