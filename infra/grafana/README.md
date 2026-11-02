# Dashboards y alertas de Grafana

Lo que Grafana muestra y avisa de la plataforma: el API y el worker envían métricas, trazas y logs por OTLP
(`AGENTS.md`, sección Telemetry). Las métricas por cliente siguen en la consola.

| Archivo | Qué es |
|---|---|
| `dashboards/cetus-overview.json` | Salud general: SLO, API, documentos, cola y errores recientes |
| `dashboards/cetus-dian.json` | La DIAN: latencia y errores por operación, rechazos y tiempo hasta validación |
| `dashboards/cetus-worker.json` | Jobs por tipo y resultado, duración, reintentos, muertos y emails |
| `dashboards/cetus-runtime.json` | Commit desplegado, JVM (memoria, GC, hilos, CPU), pool de conexiones y cachés de cada servicio |
| `alerts.json` | Reglas de alerta, en un formato corto que `scripts/grafana-sync.mjs` traduce al de Grafana |

Los cuatro dashboards marcan con la anotación **Despliegues** cada vez que el API o el worker empiezan a reportar
un commit nuevo (`service.version`, que llega a Prometheus como `target_info`).

## Publicar

`mise run grafana-sync` deja el Grafana igual al repositorio: la carpeta **Cetus**, sus dashboards y las reglas
(las que se quitaron de `alerts.json` se borran). Se puede repetir sin riesgo.

**Local:** `mise run infra-otel`, los servicios con `CETUS_OTEL_DISABLED=false`, y `mise run grafana-sync`
(Grafana en <http://localhost:3002>, `admin`/`admin`).

**Grafana Cloud:** crea una *service account* con rol **Editor** y un token suyo, y corre:

```sh
GRAFANA_URL=https://<stack>.grafana.net \
GRAFANA_TOKEN=glsa_... \
CETUS_ALERT_EMAILS=ops@ejemplo.com \
mise run grafana-sync
```

- `CETUS_ALERT_EMAILS` (separados por coma) y, si se quiere, `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID`, crean el
  punto de contacto `cetus-ops` al que van todas las alertas. Sin ellos se respeta el que ya exista (por ejemplo,
  uno hecho a mano con Slack); si no hay ninguno, las alertas siguen la política de notificación por defecto.
- Las reglas usan la fuente de métricas `grafanacloud-<stack>-prom`; otra se indica con `GRAFANA_PROMETHEUS_UID`.

## Editar

Los dashboards se pueden cambiar en Grafana y traer de vuelta con *Export → Export as JSON* (sin "Export for
sharing externally"), reemplazando el archivo. Deben seguir usando las variables `${prometheus}` y `${loki}` como
fuente de datos, para que funcionen igual en local y en Grafana Cloud. Cada métrica o etiqueta nueva sigue las
reglas de cardinalidad de `AGENTS.md`.

## Alertas

| Alerta | Condición | Severidad |
|---|---|---|
| Servicio sin telemetría | El API o el worker llevan 5 minutos sin enviar métricas (el worker no tiene chequeo público) | critical |
| Jobs muertos | Algún job pasó a `DEAD` en 15 minutos | high |
| Cola atascada | El job listo más antiguo lleva más de 5 minutos, sostenido 2 minutos | high |
| DIAN con fallas | Más del 20 % de las llamadas a la DIAN (LIVE o TEST) fallan en 10 minutos, con al menos 5 llamadas | high |
| Errores 5xx en el API | Más del 2 % de respuestas 5xx en 10 minutos, con al menos 20 peticiones | high |
| Pool de conexiones saturado | Peticiones esperando una conexión durante 5 minutos | medium |

Cada alerta enlaza a su panel y dice qué revisar primero. Sin datos (por ejemplo, sin tráfico) quedan en OK.

## Página de estado

Los clientes no ven Grafana. Ven la página de estado en Better Stack (`https://status.cantte.com`, en `statusUrl` de
docs y `statusPageUrl` de la consola) y un aviso en la consola. Better Stack mide la disponibilidad desde fuera, guarda
el historial y avisa al equipo por correo, así que reemplaza a los chequeos sintéticos de Grafana. El aviso de la
consola lee `GET /status` del API (`PlatformStatus`), que calcula los componentes desde la base con los mismos
umbrales de "DIAN con fallas" y "Cola atascada".

Monitores en Better Stack (cada 3 minutos, desde una región que la regla de países de Cloudflare deje pasar):

| Monitor | Tipo | URL | Sano cuando |
|---|---|---|---|
| API | HTTP status | `https://cetus-api.cantte.com/status` | Responde 2XX (Better Stack solo acepta 2XX; `/status` sale de caché) |
| Consola | HTTP status | `https://cetus.cantte.com/sign-in` | Responde 200 |
| Procesamiento | Palabra clave | `https://cetus-api.cantte.com/status` | Contiene `"component":"PROCESSING","status":"OPERATIONAL"` |
| DIAN · producción | Palabra clave | `https://cetus-api.cantte.com/status` | Contiene `"component":"DIAN_LIVE","status":"OPERATIONAL"` |
| DIAN · habilitación | Palabra clave | `https://cetus-api.cantte.com/status` | Contiene `"component":"DIAN_TEST","status":"OPERATIONAL"` |

Los monitores de palabra clave fallan también si el API no responde. En la página, API, Consola y Procesamiento van
bajo "Cetus" y los de la DIAN bajo "DIAN".
Los incidentes se publican en los dos lados: en Better Stack para la página y en la consola de administración
(*Incidentes*) para el aviso.

## Configuración manual

**Sentry** (picos de errores de la consola): *Alerts → Create alert → Issues*, "Number of events in an issue is
more than 20 in 5 minutes" y "A new issue is created", notificando al mismo correo o canal.

## SLO

Se ven en la fila **SLO** del dashboard de salud general:

| SLO | Objetivo | Métrica |
|---|---|---|
| Disponibilidad de `POST /v1/*` | 99,5 % mensual | `http_server_requests` sin 5xx, 30 días |
| Creación de documentos, p95 | < 500 ms | `cetus_documents_creation_duration` (solo aceptados) |
| Tiempo hasta validación LIVE, p95 | < 30 s | `cetus_documents_time_to_validation` |

El tiempo hasta validación incluye las caídas de la DIAN (se mide desde la creación hasta su respuesta): un
incumplimiento durante una caída se lee junto al dashboard de la DIAN. Empiezan como objetivos alcanzables; se
ajustan con datos reales. Si más adelante se quiere seguir el consumo del
presupuesto de error, la app de SLO de Grafana Cloud puede usar estas mismas consultas.
