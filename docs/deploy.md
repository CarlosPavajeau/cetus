# Despliegue

Producción corre en Railway, con AWS (KMS y S3) para secretos y documentos, Cloudflare delante de la consola y
Resend para el correo. `.github/workflows/deploy.yml` despliega desde `main` con `scripts/railway-deploy.sh`.
La documentación es un sitio estático en Cloudflare Pages.

## Railway

Tres servicios (`console`, `api` y `worker`) desde el mismo repositorio, cada uno construido con su Dockerfile
desde la raíz. Los Dockerfiles de Java separan en capas el wrapper de Gradle, las dependencias
(`resolveDependencies`) y el código, así que un cambio en la consola no recompila Java y uno en el código Java
no vuelve a descargar dependencias.

| Servicio | Dockerfile | Health check | Pre-deploy | Dominio |
|---|---|---|---|---|
| console | `apps/console/Dockerfile` | `/sign-in` | `pnpm db:migrate` | `cetus.cantte.com` |
| api | `apps/api/Dockerfile` | `/q/health/ready` | — (Flyway migra al arrancar) | `cetus-api.cantte.com` |
| worker | `apps/worker/Dockerfile` | `/q/health/ready` | — | — |

Todo el proyecto se describe en `.railway/railway.ts` (Infrastructure as Code de Railway): fuente, Dockerfile,
health checks, pre-deploy, réplicas, recursos y variables. Railway **no** lo lee al desplegar; se aplica con su
CLI (5.42.1 o superior):

```bash
railway login && railway link          # una vez: elige el proyecto y el entorno
railway config plan                    # muestra qué cambiaría
railway config apply                   # lo aplica, pidiendo confirmación
```

Los secretos van como `preserve()`: su valor solo vive en Railway (cárgalos *sealed* en el panel), nunca en el
archivo. Toda variable que use un servicio debe estar en `railway.ts`; `plan` muestra como eliminación cualquier
variable que exista en Railway y no esté ahí.

### Variables

| Servicio | Variables |
|---|---|
| api y worker | `CETUS_DB_URL`, `CETUS_DB_USER`, `CETUS_DB_PASSWORD`, `CETUS_KMS_KEY_ID`, `CETUS_DOCUMENTS_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (cada servicio con su propio usuario IAM) |
| api | `CETUS_DB_MIGRATION_URL` (la misma base en el puerto 5432, para Flyway), `CETUS_AUTH_JWKS_URL` (URL privada de la consola), `CETUS_AUTH_ISSUER` (igual a `BETTER_AUTH_URL`), `RESEND_WEBHOOK_SECRET` |
| worker | `CETUS_JOBS_LISTEN_URL` (la misma base en el puerto 5432, para el `LISTEN` de la cola), `RESEND_API_KEY`, `CETUS_EMAIL_FROM`, `CETUS_EMAIL_TEST_RECIPIENT`, `CETUS_OPS_ALERT_EMAIL` |
| console | `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CETUS_API_URL` (URL privada de la API), `CETUS_EDGE_SECRET`, `RESEND_API_KEY`, `CETUS_AUTH_EMAIL_FROM` |

Las URL privadas se arman con referencias, p. ej. `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}`. En el
perfil `prod`, la API y el worker escuchan en `::` (la red privada de Railway es IPv6) y escriben logs en JSON.
Las variables opcionales de operación están en [Operación](operations.md).

## Documentación (Cloudflare Pages)

`apps/docs` se publica como sitio estático en el proyecto de Pages `cetus-docs`, con el dominio
`cetus-docs.cantte.com` (un subdominio de primer nivel, cubierto por el certificado universal de
Cloudflare). No usa la integración de Git de Pages: lo despliega GitHub Actions con `wrangler`.

- **Producción:** el job `docs` de `deploy.yml`, cuando un push a `main` toca `apps/docs`.
- **Vistas previas:** `docs.yml` despliega cada pull request como rama del proyecto y deja la URL en el
  resumen del job.
- **Secretos del repositorio:** `CLOUDFLARE_API_TOKEN` (permiso *Cloudflare Pages: Edit*) y
  `CLOUDFLARE_ACCOUNT_ID`.
- **Una vez, a mano:** crear el proyecto (`wrangler pages project create cetus-docs --production-branch main`)
  y agregarle el dominio personalizado en el panel de Pages.
- `apps/docs/public/_headers` fija la caché: los recursos con hash son inmutables y el resto se revalida.

El botón de probar peticiones de la referencia llama a la API desde el navegador. La API acepta por CORS
solo el origen de la documentación (`CETUS_DOCS_ORIGIN`, por defecto `https://cetus-docs.cantte.com`), y en
desarrollo `localhost:3001`.

## Red

- `/console/*` y `/q/*` solo responden a hosts privados (`cetus.private-hosts`): la red privada de Railway
  (`*.railway.internal`), `localhost` y el health check de Railway. Por el dominio público responden 404.
- La consola solo atiende el dominio público si la petición pasó por Cloudflare: una Transform Rule de
  `cetus.cantte.com` agrega el header `X-Cetus-Edge-Secret` con el valor de `CETUS_EDGE_SECRET`, y sin él la
  consola responde 403 (el edge de Railway también responde a ese dominio si se le llama directo). La red
  privada, `localhost` y el health check no lo necesitan. Así `CF-Connecting-IP`, que alimenta el rate limit de
  Better Auth y el audit log, no se puede falsificar.

## AWS

`infra/aws/` tiene las políticas IAM de mínimo privilegio de cada servicio (`iam-cetus-prod-*.json`) y el ciclo
de vida del bucket (`s3-lifecycle.json`). La API sella secretos (`kms:GenerateDataKey`) y el worker los abre
(`kms:Decrypt`); el worker también sella la clave técnica que trae de la DIAN (GetNumberingRange), así que tiene
los dos permisos.

- El bucket debe crearse con Object Lock habilitado y **sin** retención por defecto: el worker fija la retención
  de cada documento (ver [Operación](operations.md#retención)).
- El sandbox firma con un certificado autofirmado de Cetus, sellado en
  `certificates/sandbox/cetus-sandbox.p12.sealed` y con su contraseña en
  `certificates/sandbox/cetus-sandbox.password.sealed`. Sus documentos se guardan sin Object Lock en
  `documents/sandbox/`: el worker los borra a los 10 días (`s3:DeleteObject` solo sobre ese prefijo) y la regla
  `sandbox-documents` del ciclo de vida recoge lo que quede. El bucket tiene versionado: borrar deja una versión
  anterior, que esa regla elimina al día siguiente.

## Correo (Resend)

Cuando la DIAN acepta un documento, el worker arma el `AttachedDocument` firmado y el PDF y los envía en un zip
al adquiriente. Con la misma configuración envía los avisos a los contactos de la cuenta y las alertas
operativas.

| Variable | Servicio | Uso |
|---|---|---|
| `RESEND_API_KEY` | worker | Llave con permiso solo de envío, una por ambiente |
| `CETUS_EMAIL_FROM` | worker | Remitente en el dominio verificado, p. ej. `Facturas <facturas@facturas.midominio.com>` |
| `CETUS_EMAIL_TEST_RECIPIENT` | worker | Buzón que recibe los documentos TEST en lugar del adquiriente |
| `RESEND_WEBHOOK_SECRET` | api | Secreto `whsec_…` del webhook de eventos |
| `RESEND_API_KEY` | console | Otra llave solo de envío, para los correos de la cuenta (invitaciones) |
| `CETUS_AUTH_EMAIL_FROM` | console | Remitente de esos correos, p. ej. `Cetus <cuentas@cetus.midominio.com>` |

Sin `RESEND_API_KEY` o `CETUS_EMAIL_FROM`, la entrega queda `SKIPPED`. La consola envía los correos de la cuenta
(invitaciones a una organización) con su propia llave; sin ella los escribe en el log y la invitación sigue
mostrando su enlace para copiar. En Resend:

1. Verifica un subdominio dedicado (p. ej. `facturas.midominio.com`) con los registros SPF y DKIM que muestra el
   panel, y agrega una política DMARC.
2. Crea el webhook hacia `https://<api>/internal/email-events` con los eventos `email.delivered`,
   `email.bounced`, `email.complained` y `email.failed`. Copia su secreto en `RESEND_WEBHOOK_SECRET`.

Las entregas aparecen en `deliveries` de `GET /v1/{invoices|credit-notes|debit-notes}/{id}`. Los archivos se
descargan con `GET /v1/{invoices|credit-notes|debit-notes}/{id}/files/{xml|pdf|attached-document}`, que responde
una URL prefirmada de S3 válida por 5 minutos.
