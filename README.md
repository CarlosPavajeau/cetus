# Cetus

API de facturación electrónica para Colombia (DIAN). Emite facturas, notas crédito y notas débito, las firma,
las envía a la DIAN y entrega el resultado al adquiriente por correo y a los integradores por webhooks.

Cada documento se emite en uno de tres ambientes, según la llave de API (`cetus_sandbox_…`, `cetus_test_…`,
`cetus_live_…`):

- **Sandbox:** nunca llega a la DIAN; un simulador responde. Cada cuenta nueva trae un emisor de ejemplo listo
  para emitir desde el primer minuto.
- **Test:** habilitación ante la DIAN, con el software, el certificado y el set de pruebas del emisor.
- **Live:** producción.

## Arquitectura

```
apps/
├── api/          Quarkus · REST pública (/v1) y endpoints de la consola (/console)
├── worker/       Quarkus · UBL, firma, envío y consulta a la DIAN, correos y webhooks
├── console/      TanStack Start + Better Auth · panel web (BFF hacia la API)
└── dian-mock/    Imitación local de los servicios de la DIAN (solo desarrollo)
modules/          domain, persistence, jobs, ubl, signing, dian-client, aws, email, webhooks, notifications
```

- La API valida, numera, guarda y encola; **nunca** llama a la DIAN. El worker hace el resto a partir de una
  cola de trabajos sobre Postgres.
- `domain` es Java puro, sin frameworks. Todo lo demás depende de él.
- Postgres tiene dos esquemas: `billing` (Flyway, migra al arrancar la API) y `auth` (Better Auth, migrado con
  Drizzle desde la consola).
- Los secretos del emisor (PIN, clave técnica, certificado y su contraseña) se guardan sellados con KMS; el
  `.p12` vive en S3. Los documentos firmados quedan en S3 con Object Lock.

`AGENTS.md` tiene el mapa completo del repositorio y las reglas de desarrollo.

## Desarrollo local

Requiere [mise](https://mise.jdx.dev) y Docker. mise instala las versiones fijadas en `mise.toml` (Java 25,
Node 24, pnpm y k6).

```bash
mise trust && mise install
mise run setup      # una vez: pnpm install, contenedores, migraciones de auth y compilación
mise run dev        # Postgres + LocalStack, consola (:3000), API (:8080) y worker (:8081)
mise run dev-mock   # lo mismo más el mock de la DIAN (:8090), con el worker apuntando a él
mise tasks          # lista todos los comandos
```

Cada servicio escribe con su nombre en la terminal y en `.logs/<servicio>.log`. Ctrl+C detiene los servicios;
los contenedores siguen arriba hasta `mise run infra-down`. Los depuradores escuchan en el 5005 (API) y el 5006
(worker).

Para el correo en local, copia `apps/api/.env.example` y `apps/worker/.env.example` a `.env` en su carpeta.
Sin llave de Resend, la entrega queda `SKIPPED`.

## Primera factura

1. Crea una cuenta en `http://localhost:3000/sign-up`. La consola abre el asistente para configurar un emisor
   real, pero el de sandbox no lo necesita.
2. Crea una llave de simulación en **Desarrolladores → Llaves de API** y envía una factura:

```bash
curl -X POST http://localhost:8080/v1/invoices \
  -H "Authorization: Bearer cetus_sandbox_..." \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "personType": "NATURAL_PERSON", "identificationType": "CITIZEN_ID",
      "identificationNumber": "1020304050", "legalName": "Ana Pérez",
      "taxScheme": "NOT_APPLICABLE", "email": "ana@example.com",
      "address": { "municipalityCode": "11001", "cityName": "Bogotá, D.C.", "departmentCode": "11",
                   "departmentName": "Bogotá", "line": "Calle 100 # 10-20" }
    },
    "payment": { "method": "CASH", "meansCode": "10" },
    "lines": [{ "itemCode": "CONS-001", "description": "Consultoría", "quantity": 1, "unitPrice": 100000,
                "taxes": [{ "type": "IVA", "percent": 19 }] }]
  }'
```

3. Consulta `GET /v1/invoices/{id}` hasta ver `ACCEPTED` o `REJECTED`.

`issuerId` es opcional si la cuenta tiene un solo emisor en el ambiente de la llave. Para habilitar un emisor
real ante la DIAN, ver [docs/habilitacion.md](docs/habilitacion.md).

## Pruebas

```bash
mise exec -- ./gradlew test   # API, worker y módulos (Testcontainers; no necesita el stack)
mise run test-console         # consola: Vitest + Playwright contra el stack real de `mise run dev-mock`
```

Con el stack arriba, el worker ocupa el puerto 8081, que también usa Quarkus en pruebas: corre las de Java con
`QUARKUS_HTTP_TEST_PORT=0`. La primera vez, Playwright necesita
`pnpm --filter @cetus/console exec playwright install chromium`. En CI, `console-tests.yml` levanta el mismo
stack y corre ambas suites en cada PR.

## Documentación

- [Habilitación ante la DIAN](docs/habilitacion.md): configurar un emisor, set de pruebas y notas.
- [Mock de la DIAN](docs/dian-mock.md): escenarios y variables del mock local.
- [Webhooks](docs/webhooks.md): eventos, firma y reintentos.
- [Despliegue](docs/deploy.md): Railway, AWS, Cloudflare y Resend.
- [Operación](docs/operations.md): alertas, retención, límites, sandbox y equipo de Cetus.
- [Benchmarks](bench/README.md): pruebas de carga con k6.
