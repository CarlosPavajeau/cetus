export type SnippetLang = "bash" | "js" | "python" | "json";

export type Snippet = { lang: SnippetLang; code: string };

const apiUrl = "https://cetus-api.cantte.com";

const invoiceCurl = `curl ${apiUrl}/v1/invoices \\
  -H "Authorization: Bearer $CETUS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: pedido-1001" \\
  -d '{
    "customer": {
      "personType": "NATURAL_PERSON",
      "identificationType": "CITIZEN_ID",
      "identificationNumber": "1020304050",
      "legalName": "Consumidor Final"
    },
    "payment": { "method": "CASH", "meansCode": "10" },
    "lines": [
      {
        "itemCode": "SERV-1",
        "description": "Servicio de consultoría",
        "quantity": 1,
        "unitPrice": 100000,
        "taxes": [{ "type": "IVA", "percent": 19 }]
      }
    ]
  }'`;

const invoiceJs = `const response = await fetch("${apiUrl}/v1/invoices", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.CETUS_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "pedido-1001",
  },
  body: JSON.stringify({
    customer: {
      personType: "NATURAL_PERSON",
      identificationType: "CITIZEN_ID",
      identificationNumber: "1020304050",
      legalName: "Consumidor Final",
    },
    payment: { method: "CASH", meansCode: "10" },
    lines: [
      {
        itemCode: "SERV-1",
        description: "Servicio de consultoría",
        quantity: 1,
        unitPrice: 100000,
        taxes: [{ type: "IVA", percent: 19 }],
      },
    ],
  }),
});
const invoice = await response.json();`;

const invoicePython = `import os
import requests

response = requests.post(
    "${apiUrl}/v1/invoices",
    headers={
        "Authorization": f"Bearer {os.environ['CETUS_API_KEY']}",
        "Idempotency-Key": "pedido-1001",
    },
    json={
        "customer": {
            "personType": "NATURAL_PERSON",
            "identificationType": "CITIZEN_ID",
            "identificationNumber": "1020304050",
            "legalName": "Consumidor Final",
        },
        "payment": {"method": "CASH", "meansCode": "10"},
        "lines": [
            {
                "itemCode": "SERV-1",
                "description": "Servicio de consultoría",
                "quantity": 1,
                "unitPrice": 100000,
                "taxes": [{"type": "IVA", "percent": 19}],
            }
        ],
    },
)
invoice = response.json()`;

const heroCurl = `curl ${apiUrl}/v1/invoices \\
  -H "Authorization: Bearer $CETUS_API_KEY" \\
  -H "Idempotency-Key: pedido-1001" \\
  -d @factura.json`;

const webhookPayload = `{
  "id": "0199f6b0-7c11-7a52-9e3d-2b4c6d8e0f12",
  "type": "invoice.accepted",
  "createdAt": "2026-10-25T15:04:05.123Z",
  "environment": "SANDBOX",
  "data": {
    "documentType": "INVOICE",
    "number": "FE1024",
    "status": "ACCEPTED",
    "cufe": "6ed9a8e5f0966147…",
    "externalReference": "pedido-1001",
    "dian": { "statusCode": "00", "statusMessage": "Procesado Correctamente." }
  }
}`;

const webhookRejectedPayload = `{
  "id": "0199f6b2-1d4e-7f80-a2c5-3e7f9a1b4c26",
  "type": "invoice.rejected",
  "createdAt": "2026-10-25T15:09:12.408Z",
  "environment": "SANDBOX",
  "data": {
    "documentType": "INVOICE",
    "number": "FE1025",
    "status": "REJECTED",
    "cufe": "9b41c2d7e0a35f18…",
    "externalReference": "pedido-1002",
    "dian": {
      "statusCode": "99",
      "statusMessage": "Validación contiene errores en campos mandatorios.",
      "errors": [
        "Regla: FAK26, Rechazo: Responsabilidad informada para receptor no valida según lista.",
        "Regla: FAB10a, Rechazo: El prefijo de numeración no es igual al código de la sucursal correspondiente a este punto de facturación",
        "Regla: FAJ43b, Notificación: Nombre informado No corresponde al registrado en el RUT con respecto al Nit suminstrado."
      ]
    }
  }
}`;

/** The code the landing shows, highlighted once on the server; the browser only gets the HTML. */
export const snippets = {
  heroCurl: { lang: "bash", code: heroCurl },
  invoiceCurl: { lang: "bash", code: invoiceCurl },
  invoiceJs: { lang: "js", code: invoiceJs },
  invoicePython: { lang: "python", code: invoicePython },
  webhookPayload: { lang: "json", code: webhookPayload },
  webhookRejectedPayload: { lang: "json", code: webhookRejectedPayload },
} as const satisfies Record<string, Snippet>;

export type SnippetName = keyof typeof snippets;
