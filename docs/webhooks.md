# Webhooks

Los integradores registran URLs que reciben un `POST` firmado cuando cambia uno de sus documentos, sin
consultar en ciclo. Se administran en la consola, en **Desarrolladores → Webhooks** (por ambiente, con un
filtro opcional de eventos). El secreto `whsec_…` se muestra una sola vez, al crear el endpoint, y se guarda sellado con KMS.

| Evento | Cuándo |
|---|---|
| `invoice.accepted`, `credit_note.accepted`, `debit_note.accepted` | La DIAN validó el documento |
| `invoice.rejected`, `credit_note.rejected`, `debit_note.rejected` | La DIAN lo rechazó |
| `invoice.failed`, `credit_note.failed`, `debit_note.failed` | El worker se rindió (sin más reintentos) |
| `document.delivered` | El correo con el `AttachedDocument` y el PDF llegó al adquiriente |
| `document.delivery_failed` | El correo rebotó, fue marcado como spam, falló o no había a quién enviarlo: hay que entregar el documento por otro medio |

Cada hecho se publica una sola vez. El cuerpo es el mismo en todos los reintentos:

```json
{ "id": "…", "type": "invoice.accepted", "createdAt": "…", "environment": "TEST",
  "data": { "id": "…", "documentType": "INVOICE", "number": "SETP990000005", "status": "ACCEPTED",
            "cufe": "…", "issueDate": "2026-10-19", "externalReference": "…", "referencedInvoiceId": null,
            "dian": { "statusCode": "00", "statusMessage": "…", "errors": [] },
            "delivery": { "status": "BOUNCED", "recipient": "…", "reason": "…" } } }
```

`delivery` solo viene en los eventos `document.*`. La firma sigue
[Standard Webhooks](https://www.standardwebhooks.com/), así que sirve cualquiera de sus librerías (o la de
Svix). Los encabezados son:

- `webhook-id`: el id del evento, igual en cada reintento. Úsalo para descartar repetidos.
- `webhook-timestamp`: los segundos Unix del envío. Rechaza los que tengan más de 5 minutos.
- `webhook-signature`: `v1,<base64>`, donde el valor es el HMAC-SHA256 de `<webhook-id>.<webhook-timestamp>.<cuerpo>`
  con la parte base64 del secreto (sin `whsec_`) como llave.

```text
key      = base64_decode(secret.removePrefix("whsec_"))
expected = "v1," + base64(hmac_sha256(key, id + "." + timestamp + "." + rawBody))
valid    = constant_time_equals(expected, header) && |now - timestamp| <= 300
```

Cualquier respuesta 2xx confirma la entrega. Un timeout, un error de red o cualquier otro código se reintenta
con backoff exponencial: hasta 10 intentos durante unas 4 o 5 horas. Un `410 Gone` detiene los reintentos. El
historial queda en `GET /console/webhook-endpoints/{id}/deliveries`, y
`POST …/deliveries/{deliveryId}/retry` reenvía una entrega.

Tras 10 intentos fallidos seguidos (`cetus.webhooks.failing-notice-after`) se avisa a los contactos técnicos de
la cuenta. Un endpoint que lleva 3 días fallando (`cetus.webhooks.auto-disable.after`), con al menos 10 intentos
fallidos (`…min-failures`) y ningún 2xx en medio, se desactiva solo, con `disabledReason: AUTOMATIC`. Sus entregas
pendientes se cancelan y la desactivación queda en la actividad de la cuenta. `POST /console/webhook-endpoints/{id}/enable`
lo reactiva y pone en cero el conteo de fallas.

En LIVE la URL debe ser `https`. El worker no envía a direcciones internas (loopback, redes privadas,
link-local, CGNAT), no usa proxy y no sigue redirecciones. La verificación vive en el DNS del propio cliente
HTTP (OkHttp), así que se revisan las mismas IPs a las que se conecta: un host que responde una IP pública al
validar y una interna al conectar (DNS rebinding) queda bloqueado. En dev y en pruebas,
`cetus.webhooks.allow-private-targets=true` permite `localhost`.
