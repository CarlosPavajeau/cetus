# Dashboards y alertas de Grafana

Lo que Grafana muestra y avisa de la plataforma: el API y el worker envían métricas, trazas y logs por OTLP
(`AGENTS.md`, sección Telemetry). Las métricas por cliente siguen en la consola.

| Archivo | Qué es |
|---|---|
| `dashboards/cetus-overview.json` | Salud general: SLO, API, documentos, cola y errores recientes |
| `dashboards/cetus-dian.json` | La DIAN: latencia y errores por operación, rechazos y tiempo hasta validación |
| `dashboards/cetus-worker.json` | Jobs por tipo y resultado, duración, reintentos, muertos y emails |
| `dashboards/cetus-runtime.json` | JVM (memoria, GC, hilos, CPU) y pool de conexiones de cada servicio |
| `alerts.json` | Reglas de alerta, en un formato corto que `scripts/grafana-sync.mjs` traduce al de Grafana |

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
| Sitio caído | Todos los chequeos sintéticos de un sitio fallaron durante 3 minutos | critical |
| Servicio sin telemetría | El API o el worker llevan 5 minutos sin enviar métricas (el worker no tiene chequeo público) | critical |
| Jobs muertos | Algún job pasó a `DEAD` en 15 minutos | high |
| Cola atascada | El job listo más antiguo lleva más de 5 minutos, sostenido 2 minutos | high |
| DIAN con fallas | Más del 20 % de las llamadas a la DIAN (LIVE o TEST) fallan en 10 minutos, con al menos 5 llamadas | high |
| Errores 5xx en el API | Más del 2 % de respuestas 5xx en 10 minutos, con al menos 20 peticiones | high |
| Pool de conexiones saturado | Peticiones esperando una conexión durante 5 minutos | medium |

Cada alerta enlaza a su panel y dice qué revisar primero. Sin datos (por ejemplo, sin tráfico) quedan en OK.

## Configuración manual

**Chequeos sintéticos** (*Testing & synthetics → Synthetics → Add new check → HTTP*), desde dos o más sondas, cada
minuto. El *job* debe ser exactamente el de la tabla: la alerta "Sitio caído" filtra por él.

| Job | URL | Respuesta válida |
|---|---|---|
| `health-api` | `https://cetus-api.cantte.com/v1/issuers` | 401 (sin API key responde sin tocar la base) |
| `health-console` | `https://cetus.cantte.com/sign-in` | 200 |
| `health-docs` | `https://cetus-docs.cantte.com/` | 200 |

**Sentry** (picos de errores de la consola): *Alerts → Create alert → Issues*, "Number of events in an issue is
more than 20 in 5 minutes" y "A new issue is created", notificando al mismo correo o canal.

## SLO

Se ven en la fila **SLO** del dashboard de salud general:

| SLO | Objetivo | Métrica |
|---|---|---|
| Disponibilidad de `POST /v1/*` | 99,5 % mensual | `http_server_requests` sin 5xx, 30 días |
| Creación de documentos, p95 | < 500 ms | `cetus_documents_creation_duration` (solo aceptados) |
| Tiempo hasta validación LIVE, p95 | < 30 s, sin contar caídas de la DIAN | `cetus_documents_time_to_validation` |

Empiezan como objetivos alcanzables; se ajustan con datos reales. Si más adelante se quiere seguir el consumo del
presupuesto de error, la app de SLO de Grafana Cloud puede usar estas mismas consultas.
