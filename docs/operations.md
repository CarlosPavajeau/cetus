# Operación

## Variables

Todas son opcionales; sin ellas rigen los valores por defecto.

| Variable | Servicio | Uso |
|---|---|---|
| `CETUS_OPS_ALERT_EMAIL` | worker | Buzón de alertas operativas. Sin él, las alertas solo quedan en el log (`WARN`) |
| `CETUS_SUPPORT_EMAIL` | worker | Buzón de soporte: recibe los casos y opiniones de la consola, con el autor como `Reply-To`. Sin él, solo quedan en la base y en el log (`WARN`) |
| `CETUS_CONSOLE_URL` | worker | URL de la consola para los enlaces de los avisos (por defecto `http://localhost:3000`) |
| `CETUS_NOTIFICATIONS_FROM` | worker | Remitente de los avisos a contactos (por defecto, `CETUS_EMAIL_FROM`) |
| `CETUS_STORAGE_RETENTION_DAYS` | worker | Días de bloqueo (Object Lock) de cada documento. En `prod`, 1826 |
| `CETUS_RETENTION_*` | worker | Retención de datos: `API_KEY_REQUESTS` (30 días), `DONE_JOBS` (7), `NOTIFICATIONS` (365), `SANDBOX_DOCUMENTS` (10), `SUPPORT_ATTACHMENTS` (1, adjuntos de casos nunca enviados) |
| `CETUS_JOBS_CONCURRENCY`, `CETUS_JOBS_LIMIT_*` | worker | Trabajos simultáneos en total (12) y por tipo |
| `CETUS_RATE_LIMIT_REQUESTS_PER_SECOND`, `CETUS_RATE_LIMIT_BURST` | api | Límite por llave de API en `/v1/**` (10 y 20) |
| `CETUS_SANDBOX_*` | api, worker | Límites del sandbox (ver abajo) |

## Alertas

El worker envía un correo cuando algo necesita una persona:

- Cada 5 minutos revisa jobs `DEAD`, documentos que llevan más de 15 minutos sin llegar a la DIAN y rangos que
  no coinciden con los de la DIAN.
- Cada día a las 7:00 revisa certificados a menos de 30 días de vencer, y rangos con menos del 10 % disponible o
  a menos de 30 días de su fin.
- Cada condición se avisa una vez y se repite como máximo cada 24 horas mientras siga (tabla `ops_alerts`). Una
  condición resuelta se olvida, así que se avisa de nuevo si vuelve.
- Con varias réplicas, un advisory lock de Postgres hace que corra una sola a la vez.

## Avisos a los contactos

Cada cuenta registra contactos por categoría en **Contactos**, en el menú de la cuenta (`TECHNICAL`, `FISCAL` y `BILLING`), y
cada dirección se verifica con un enlace. Cada día a las 8:00 el worker les avisa de certificados y resoluciones
por vencer, rangos por agotarse y picos de rechazos; los contactos técnicos también reciben los avisos de
webhooks que fallan o se desactivan.

## Retención

Los artefactos de cada documento (XML firmado, zip, respuestas de la DIAN, AttachedDocument, PDF) se escriben con
Object Lock en modo compliance. Nadie puede alterarlos ni borrarlos antes de que venza la retención, ni siquiera
el root de AWS. La retención no se puede acortar después: prueba el bucket con `CETUS_STORAGE_RETENTION_DAYS=1`
antes de usar el valor por defecto. Los certificados sellados de `certificates/` quedan sin bloquear, y en local
LocalStack crea el bucket sin retención.

Cada día a las 3:30 el worker borra por lotes los datos que vencen según `CETUS_RETENTION_*`.

## Límites

- **Llaves de API.** Cada llave tiene un token bucket en memoria. Al pasarlo, la API responde `429 rate_limited`
  con `Retry-After`. El límite es por réplica de la API.
- **Sandbox.** Cualquiera obtiene una llave sin configurar nada, así que tiene límites propios: 5 peticiones por
  segundo (ráfaga de 10), 200 documentos al día por cuenta (`429 sandbox_daily_limit`), 5 emisores por cuenta
  (`422 sandbox_issuer_limit`) y 30 correos al día, que van al contacto técnico y no al adquiriente.

## Verificación del rango

Cuando un emisor de **producción** ya tiene software y certificado, el worker consulta `GetNumberingRange` por
cada rango de factura y lo compara con lo registrado: prefijo, números, vigencia y clave técnica. Una clave
técnica mal digitada haría inválidos todos los CUFE. La consola muestra el resultado en la columna "DIAN" y
permite consultar de nuevo, y una diferencia genera una alerta.

En habilitación no aplica: el rango de prueba (`SETP`) es compartido, la DIAN no lo registra por NIT y siempre
responde `301`.

## Equipo de Cetus

Los roles de plataforma (`admin` y `support`) viven en `auth.user.role` (plugin `admin` de Better Auth) y no
tienen nada que ver con los roles dentro de una organización.

- Se asignan a mano y nunca desde la API. La persona se registra normalmente en la consola y luego:
  `UPDATE auth."user" SET role = 'admin' WHERE email = 'persona@cantte.com';`
- El rol solo tiene efecto con la verificación en dos pasos activa (**Seguridad**, en el menú de la cuenta). Sin ella, el JWT no
  lleva el claim `groups` y Better Auth rechaza sus endpoints `/api/auth/admin/*`.
- `support` lee y hace acciones asistidas. Solo `admin` bloquea usuarios, suspende cuentas y suplanta.
- La administración está en `/admin` de la consola. Una cuenta suspendida no puede usar sus llaves de API
  (`403 account_suspended`) y su consola queda en solo lectura, con el motivo visible. Los documentos que ya
  estaban en cola se terminan de procesar, porque ya tienen número asignado.
