# Cetus

API de facturación electrónica para Colombia (DIAN). Monorepo de **cantte**.

```
cetus/
├── apps/
│   ├── api/          Quarkus · REST pública (/v1) y endpoints de consola (/console)
│   ├── worker/       Quarkus · UBL, firma XAdES, envío a la DIAN, consulta de estado
│   └── console/      TanStack Start + Better Auth · panel web (BFF hacia la API)
├── modules/
│   ├── domain/       Java puro · modelo, cálculos, CUFE/CUDE, reglas DIAN
│   ├── persistence/  Panache + migraciones Flyway (esquema "billing")
│   ├── jobs/         Cola de trabajos sobre Postgres (FOR UPDATE SKIP LOCKED)
│   ├── ubl/          Modelo JAXB de UBL 2.1 escrito a mano + mapper
│   ├── signing/      Firma XAdES-EPES con la API del JDK
│   ├── dian-client/  SOAP 1.2 + WS-Security + HttpClient
│   └── aws/          KMS (cifrado envelope) y S3
├── build-logic/      Convention plugins de Gradle
├── infra/            Scripts de inicialización para desarrollo local
└── docker-compose.yml
```

## Reglas de arquitectura

- `domain` no depende de ningún framework. Todo apunta hacia él.
- La API **nunca** llama a la DIAN: valida, numera, guarda y encola. El worker hace el resto.
- Better Auth es dueño de usuarios, organizaciones y membresías (esquema `auth`, migrado con Drizzle).
  `billing.accounts.organization_id` guarda el ID de la organización, sin llave foránea entre esquemas.
- Flyway solo gestiona `billing`; Drizzle solo gestiona `auth` (`schemaFilter`). Nunca uses `drizzle-kit push` en producción.
- Los secretos (PIN, clave técnica, contraseña y archivo del certificado) se guardan "sellados" con KMS.
  El `.p12` vive en S3; en la base de datos solo hay metadatos.

## Requisitos

Java 21, Node 22 con pnpm, Docker. Gradle solo para generar el wrapper la primera vez.

## Desarrollo local con `make`

```bash
make setup      # una vez: pnpm install, contenedores, migraciones de auth y compilación
make dev        # infra + consola (:3000), API (:8080) y worker (:8081) en una sola terminal
make dev-mock   # lo mismo más el mock de la DIAN (:8090), con el worker apuntando a él
make api        # un solo servicio (también console, worker, mock), por si lo quieres en otra pestaña
make            # lista todos los comandos
```

`make dev` levanta Postgres y LocalStack y espera a que estén listos, exporta las credenciales ficticias de AWS,
compila una vez los módulos compartidos y arranca la consola antes que la API (por el JWKS). Cada línea sale con
el nombre del servicio y queda también en `.logs/<servicio>.log`. Ctrl+C detiene los servicios; los contenedores
siguen arriba hasta `make infra-down`. El worker escucha el depurador en el puerto 5006 (la API en el 5005).

Los pasos manuales equivalentes:

## Primer arranque local

```bash
# 1. Wrapper de Gradle (no se incluye el .jar en este esqueleto)
gradle wrapper --gradle-version 8.10.2

# 2. Infraestructura: Postgres con los esquemas billing/auth y LocalStack con KMS + S3
docker compose up -d

# 3. Credenciales ficticias para que el SDK de AWS hable con LocalStack
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_REGION=us-east-1

# 4. Consola: migraciones del esquema auth y servidor en :3000
cp apps/console/.env.example apps/console/.env    # genera BETTER_AUTH_SECRET con: openssl rand -base64 32
pnpm install
pnpm --filter @cetus/console db:migrate
pnpm console:dev

# 5. API (:8080, ejecuta Flyway al iniciar) y worker (:8081)
./gradlew :apps:api:quarkusDev
./gradlew :apps:worker:quarkusDev
```

La API valida los JWT de la consola descargando las llaves públicas de `http://localhost:3000/api/auth/jwks`,
así que arranca la consola primero.

## Mock local de la DIAN

`apps/dian-mock` imita `WcfDianCustomerServices.svc` (SendBillSync, SendTestSetAsync, GetStatus, GetStatusZip)
para probar el flujo sin la DIAN ni un certificado de una CA acreditada:

```bash
./gradlew :apps:dian-mock:run                          # escucha en :8090
CETUS_DIAN_TEST_URL=http://localhost:8090/WcfDianCustomerServices.svc ./gradlew :apps:worker:quarkusDev
```

Solo se redirige el ambiente de pruebas; producción siempre usa la URL real. El mock verifica la firma WS-Security
(Timestamp, BinarySecurityToken, firma sobre `wsa:To`) pero acepta certificados autofirmados. Cuando algo falla
responde el mismo `s:Client` sin razón que la DIAN y deja la causa real en su log. Del documento solo revisa la
estructura (zip con un XML firmado, `cbc:ID`, `cbc:UUID`) y rechaza los CUFE repetidos (regla 90); no aplica las
reglas de validación de la DIAN. Los mensajes que genera empiezan por `Mock:`.

```bash
curl -X POST "localhost:8090/__mock/scenario?name=reject"   # accept | reject | client-fault | server-fault | timeout
curl localhost:8090/__mock/documents                        # documentos recibidos y su resultado
curl -X POST localhost:8090/__mock/reset                    # olvida todo
```

Variables: `DIAN_MOCK_PORT` (8090), `DIAN_MOCK_SCENARIO` (accept), `DIAN_MOCK_REJECT_SELF_SIGNED` (false; en true
rechaza los autofirmados como la DIAN), `DIAN_MOCK_TIMEOUT_DELAY` (PT90S) y `DIAN_MOCK_PROCESSING_POLLS` (1, consultas
de GetStatusZip que responden "en proceso" antes del resultado).

## Probar el flujo completo en habilitación

1. Crea tu cuenta en `http://localhost:3000/sign-up` (crea usuario, organización y cuenta en la API).
2. La consola te lleva al asistente de configuración (`http://localhost:3000/setup`), que registra el emisor en
   cuatro pasos: datos del RUT, software DIAN (Software ID, PIN y TestSetId del portal de habilitación),
   certificado `.p12` con su contraseña y numeración (ya trae la del set de pruebas: prefijo `SETP`,
   990000000 a 995000000; solo falta la clave técnica). Cada paso se guarda al continuar, así que puedes
   retomarlo donde lo dejaste. Con las tres piezas, el emisor pasa a `TESTING`.
   También puedes hacerlo con los endpoints de consola: `POST /console/issuers`, `PUT /console/issuers/{id}/software`,
   `PUT /console/issuers/{id}/certificate` (`.p12` en base64 y contraseña) y `POST /console/issuers/{id}/numbering-ranges`.
3. Crea una llave de pruebas en la consola y envía una factura:

```bash
curl -X POST http://localhost:8080/v1/invoices \
  -H "Authorization: Bearer cetus_test_..." \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "issuerId": "<id del emisor>",
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

   El `issuerId` aparece en la consola (sección Emisores) y en `GET /v1/issuers`, que lista los emisores
   de la cuenta en el ambiente de la llave. Puedes omitirlo si la cuenta tiene un solo emisor habilitado en
   ese ambiente; con varios, la API responde `422 issuer_required`. La respuesta trae el `issuerId` usado.

4. Consulta `GET /v1/invoices/{id}` hasta ver `ACCEPTED` o `REJECTED` con los errores de la DIAN.
   Los XML firmados y las respuestas quedan en S3 (`documents/test/{nit}/...`).

## Pruebas

- **API y worker:** `./gradlew test` (Quarkus con Testcontainers; no necesita el stack levantado).
- **Consola:** corre contra el stack real, sin mocks. Levántalo con `make dev-mock` y en otra terminal ejecuta
  `make test-console`. Cada prueba crea su propia organización, así que no hay que limpiar datos.
  - `pnpm --filter @cetus/console test:integration`: Vitest (`apps/console/tests/integration`). Prueba el contrato
    entre la consola y la API (JWT de Better Auth, aislamiento por organización) y el catálogo DIVIPOLA.
  - `pnpm --filter @cetus/console test:e2e`: Playwright (`apps/console/tests/e2e`). Prueba el navegador de punta a
    punta, por ejemplo el asistente de configuración completo. La primera vez instala el navegador con
    `pnpm --filter @cetus/console exec playwright install chromium`.
  - `CONSOLE_URL` y `CETUS_API_URL` apuntan las pruebas a otro entorno (por defecto `:3000` y `:8080`).
  - En CI, `.github/workflows/console-tests.yml` levanta el mismo stack con `scripts/dev.sh --mock` y corre ambas
    suites en cada PR que toque las apps, los módulos o la infraestructura. Si fallan, adjunta el reporte de
    Playwright (con trazas) y los logs de cada servicio.

## Despliegue en Railway

Cuatro servicios desde el mismo repositorio, con el directorio raíz en la raíz del repo:

| Servicio | Dockerfile | Pre-deploy |
|---|---|---|
| api | `apps/api/Dockerfile` | migraciones Flyway (o `migrate-at-start`) |
| worker | `apps/worker/Dockerfile` | — |
| console | `apps/console/Dockerfile` | `pnpm db:migrate` |

Variables principales: `CETUS_DB_URL`, `CETUS_DB_USER`, `CETUS_DB_PASSWORD`, `CETUS_KMS_KEY_ID`,
`CETUS_DOCUMENTS_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (API y worker);
`CETUS_AUTH_JWKS_URL` (URL privada de la consola) y `CETUS_AUTH_ISSUER` (URL pública) en la API;
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CETUS_API_URL` (URL privada de la API) en la consola.
Los endpoints `/console/*` solo deberían ser accesibles por la red privada.

### Entrega por correo (Resend)

Cuando la DIAN acepta un documento, el worker arma el `AttachedDocument` firmado y el PDF, y los envía en un
zip al adquiriente. Las llaves solo se leen del entorno y nunca van en el código:

| Variable | Servicio | Uso |
|---|---|---|
| `RESEND_API_KEY` | worker | Llave con permiso solo de envío, una por ambiente |
| `CETUS_EMAIL_FROM` | worker | Remitente en el dominio verificado, p. ej. `Facturas <facturas@facturas.midominio.com>` |
| `CETUS_EMAIL_TEST_RECIPIENT` | worker | Buzón que recibe los documentos TEST en lugar del adquiriente |
| `RESEND_WEBHOOK_SECRET` | api | Secreto `whsec_…` del webhook de eventos |

Sin `RESEND_API_KEY` o `CETUS_EMAIL_FROM`, la entrega queda `SKIPPED`. En local, copia
`apps/worker/.env.example` a `apps/worker/.env` (y `apps/api/.env.example` a `apps/api/.env`): Quarkus en modo
dev los lee y git los ignora.

En Resend:

1. Verifica un subdominio dedicado (p. ej. `facturas.midominio.com`) con los registros SPF y DKIM que muestra el
   panel, y agrega una política DMARC.
2. Crea el webhook hacia `https://<api>/internal/email-events` con los eventos `email.delivered`,
   `email.bounced`, `email.complained` y `email.failed`. Copia su secreto en `RESEND_WEBHOOK_SECRET`.

Las entregas aparecen en `deliveries` de `GET /v1/invoices/{id}` y `GET /v1/credit-notes/{id}`. Los archivos
se descargan con `GET /v1/{invoices|credit-notes}/{id}/files/{xml|pdf|attached-document}`, que responde una URL
prefirmada de S3 válida por 5 minutos.

## Pendiente de validar contra la DIAN

Todo lo marcado en comentarios como "confirm/verify" debe revisarse con el anexo técnico vigente y con
respuestas reales de habilitación: hash de la política de firma, formato del QR, reglas de redondeo y
tolerancias, códigos de estado de `GetStatusZip`, encabezados WS-Security y `BaseQuantity` de las líneas.
Los XSD de la caja de herramientas van en `modules/ubl/src/main/xsd` para validar en pruebas.

## Siguientes pasos

Notas crédito y débito (CUDE), `AttachedDocument`, PDF con QR, envío por correo (SES), webhooks,
panel de configuración del emisor en la consola, tipos TypeScript generados desde OpenAPI (`pnpm --filter @cetus/console api:types`)
y roles por organización en los endpoints de consola.
