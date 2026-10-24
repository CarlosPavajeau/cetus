# Mock de la DIAN

`apps/dian-mock` imita `WcfDianCustomerServices.svc` (SendBillSync, SendTestSetAsync, GetStatus, GetStatusZip,
GetNumberingRange) para probar el flujo de habilitación sin la DIAN ni un certificado de una CA acreditada.
`mise run dev-mock` lo levanta en `:8090` con el worker apuntando a él. Por separado:

```bash
mise run mock                                                         # :8090
CETUS_DIAN_TEST_URL=http://localhost:8090/WcfDianCustomerServices.svc mise run worker
```

Solo se redirige el ambiente de pruebas; producción siempre usa la URL real.

## Qué valida

- La firma WS-Security (Timestamp, BinarySecurityToken, firma sobre `wsa:To`), aceptando certificados
  autofirmados.
- La estructura del documento (zip con un XML firmado, `cbc:ID`, `cbc:UUID`) y los CUFE repetidos (regla 90).

No aplica las reglas de validación de la DIAN. Cuando algo falla responde el mismo `s:Client` sin razón que la
DIAN y deja la causa real en su log. Sus mensajes empiezan por `Mock:`.

## Respuestas

Lo que pasa esas revisiones lo responde el mismo simulador del sandbox (`SimulatedDian`), con un
ApplicationResponse firmado como el de la DIAN. El resultado depende del adquiriente:

| Adquiriente | Resultado |
|---|---|
| `1000000001` | Aceptado con la notificación FAJ43b |
| `1000000002` | Rechazado con FAK26 y FAB10a |
| `1000000003` | El primer envío responde tarde (tras `DIAN_MOCK_TIMEOUT_DELAY`), pero queda aceptado |
| `1000000004` | Falla de servidor en los dos primeros envíos |
| `1000000005` | Rechaza las notas crédito por CBF04 |
| Cualquier otro | Aceptado |

`GetNumberingRange` responde siempre con el rango de habilitación (`SETP`), lo que sirve para probar emisores
LIVE en local.

## Control

Los escenarios globales se imponen sobre los del adquiriente:

```bash
curl localhost:8090/__mock                                    # escenario actual y contadores
curl -X POST "localhost:8090/__mock/scenario?name=reject"     # accept | reject | client-fault | server-fault | timeout
curl -X POST "localhost:8090/__mock/latency?value=PT1S"       # demora antes de cada respuesta SOAP
curl localhost:8090/__mock/documents                          # documentos recibidos y su resultado
curl -X POST localhost:8090/__mock/reset                      # olvida todo
```

## Variables

| Variable | Por defecto | Uso |
|---|---|---|
| `DIAN_MOCK_PORT` | `8090` | Puerto |
| `DIAN_MOCK_SCENARIO` | `accept` | Escenario global inicial |
| `DIAN_MOCK_LATENCY` | `PT0S` | Demora antes de cada respuesta SOAP (ISO-8601) |
| `DIAN_MOCK_REJECT_SELF_SIGNED` | `false` | En `true`, rechaza los certificados autofirmados como la DIAN |
| `DIAN_MOCK_TIMEOUT_DELAY` | `PT90S` | Demora del escenario `timeout` y del adquiriente `1000000003` |
| `DIAN_MOCK_PROCESSING_POLLS` | `1` | Consultas de GetStatusZip que responden "en proceso" antes del resultado |
| `DIAN_MOCK_SIGNER`, `DIAN_MOCK_SIGNER_PASSWORD` | certificado de prueba del jar (`cetus-test`) | PKCS#12 que firma el ApplicationResponse |
