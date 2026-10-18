/** Spanish reason phrases for the statuses the API answers with. */
const statusText: Record<number, string> = {
  200: "OK",
  201: "Creada",
  202: "Aceptada",
  204: "Sin contenido",
  400: "Solicitud inválida",
  401: "No autorizada",
  403: "Prohibida",
  404: "No encontrada",
  409: "Conflicto",
  415: "Tipo no soportado",
  422: "No procesable",
  429: "Demasiadas solicitudes",
  500: "Error interno",
  502: "Puerta de enlace inválida",
  503: "No disponible",
};

/** "201 · Creada"; just the code when the status has no known phrase. */
export function statusLabel(status: number) {
  const text = statusText[status];
  return text ? `${status} · ${text}` : String(status);
}
