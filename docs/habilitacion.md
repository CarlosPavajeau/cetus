# Habilitación ante la DIAN

Cómo llevar un emisor real por el set de pruebas de la DIAN y luego a producción. Para probar sin la DIAN, usa
el emisor de sandbox o el [mock local](dian-mock.md).

## Configurar el emisor

El asistente de la consola (`/setup`) registra el emisor de habilitación en cuatro pasos. Cada paso se guarda
al continuar, así que se puede retomar donde quedó:

1. **Datos del RUT.**
2. **Software DIAN:** Software ID, PIN y TestSetId del portal de habilitación.
3. **Certificado:** el `.p12` y su contraseña. Si los tiene otra persona, la consola genera un enlace de un solo
   uso (`/certificate-upload/{token}`) para que lo suba sin entrar a la cuenta.
4. **Numeración:** ya trae la del set de pruebas (prefijo `SETP`, 990000000 a 995000000); solo falta la clave
   técnica.

Con software, certificado y numeración, el emisor pasa a `TESTING`. Lo mismo se puede hacer con los endpoints de
la consola: `POST /console/issuers`, `PUT /console/issuers/{id}/software`, `PUT /console/issuers/{id}/certificate`
(`.p12` en base64 y contraseña) y `POST /console/issuers/{id}/numbering-ranges`.

## Enviar documentos

Con una llave de pruebas (`cetus_test_…`), envía facturas a `POST /v1/invoices` (ver el ejemplo del README) y
consulta `GET /v1/invoices/{id}` hasta ver `ACCEPTED` o `REJECTED` con los errores de la DIAN. Los XML firmados y
las respuestas quedan en S3, en `documents/test/{nit}/...`.

`GET /v1/issuers` lista los emisores de la cuenta en el ambiente de la llave. Con varios, `issuerId` es
obligatorio y la API responde `422 issuer_required` si falta.

## Notas crédito y débito

Sobre una factura aceptada se emiten notas con `POST /v1/credit-notes` y `POST /v1/debit-notes`. Cada tipo
necesita su propio rango de numeración sin resolución (por ejemplo, prefijos `NC` y `ND`), creado con
`POST /console/issuers/{id}/numbering-ranges`.

- **Nota crédito:** conceptos de la tabla 13.2.4. Una `CANCELLATION` sin líneas copia las de la factura.
- **Nota débito:** `INTEREST`, `EXPENSES`, `VALUE_CHANGE` u `OTHER` (tabla 13.2.5); siempre lleva sus líneas.

`GET /v1/invoices/{id}` lista `creditNotes`, `debitNotes` y el `balance` que aún pueden acreditar las notas
crédito: el total más las notas débito aceptadas, menos las notas crédito aceptadas o en curso.

## Pasar a producción

La habilitación se completa en el portal de la DIAN; Cetus no puede verificarla. Después,
`POST /console/issuers/{id}/promote` (o el botón de la consola) crea el emisor de producción con los mismos datos,
el mismo software (sin set de pruebas) y una copia del certificado si sigue vigente. Solo falta la numeración de
la resolución, que el asistente pide a continuación. El worker verifica cada rango de producción contra la DIAN
(ver [Operación](operations.md#verificación-del-rango)).
