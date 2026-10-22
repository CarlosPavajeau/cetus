# Benchmark de capacidad

Mide cuánto aguanta Cetus con los recursos que tiene en Railway (`.railway/railway.ts`): el API y el worker con
1 vCPU / 1 GB cada uno y la consola con 1 vCPU / 512 MB. Corre las imágenes de producción (no `quarkusDev`) con
esos límites, contra el mock de la DIAN, y genera la carga con [k6](https://k6.io).

## Uso

```sh
brew install k6
make bench-up      # construye y levanta el stack (proyecto cetus-bench, puertos propios: convive con make dev-mock)
make bench-seed    # organizaciones, emisores, API keys (bench/.state.json) e historial de documentos
make bench SCENARIO=public-api PROFILE=smoke
make bench SCENARIO=public-api PROFILE=load RATE=200
bench/bench.sh drain  # entre corridas: vacía la cola que dejó la anterior
make bench-coldstart SCENARIO=public-api   # reinicia el API y el worker y los carga en frío (700/s durante 2 min)
make bench-down    # bench/bench.sh down -v borra también su base de datos
```

Cada corrida deja en `bench/results/<fecha>-<escenario>-<perfil>/` (no versionado):

| Archivo | Contenido |
|---|---|
| `report.html` | Dashboard de k6: tasa, latencias y errores en el tiempo |
| `summary.json`, `k6.log` | Resumen final por endpoint (`name`) y umbrales |
| `containers.csv` | CPU y memoria de cada contenedor cada 5 s |
| `jobs.csv` | Cola de jobs pendientes por tipo y antigüedad del más viejo (el backlog del worker) |
| `connections.csv` | Conexiones a Postgres por estado |
| `run.txt`, `services.log` | Parámetros de la corrida, límites aplicados y logs del API, el worker y la consola |

## Escenarios (`bench/scenarios/`)

| Escenario | Qué mide | Mezcla |
|---|---|---|
| `public-api` | Recepción del API para integradores (`/v1`) | 25% `POST /v1/invoices`, 70% `GET /v1/invoices/{id}`, 5% `GET /v1/issuers` |
| `end-to-end` | Documentos por segundo que el worker lleva a ACCEPTED y cuánto espera el integrador | `POST` + polling hasta estado final |
| `console-api` | El API detrás de la consola (`/console`), con el JWT que emite la consola | listado, paginación, búsqueda, detalle, emisores, auditoría |
| `console-pages` | Páginas SSR de la consola con sesión, incluyendo su llamada al API | `/overview`, `/documents`, `/documents/{id}`, `/issuers` |
| `mixed` | Todo a la vez (`SHARES=60,25,15` por defecto) | las tres anteriores |

Perfiles (`PROFILE`, modelo abierto: k6 mantiene la tasa aunque el servidor se ponga lento):

- `smoke`: 2 req/s durante 30 s; solo comprueba que el escenario funciona.
- `load`: sube del 10% al 100% de `RATE` en escalones de 1 minuto y lo mantiene 2 minutos. Sirve para encontrar la rodilla.
- `stress`: llega a 2× `RATE`. Muestra cómo falla y si se recupera.
- `soak`: 70% de `RATE` durante `DURATION` (15m). Sirve para detectar fugas, pausas de GC y agotamiento del pool.
- `constant`: `RATE` fija durante `DURATION` (2m). Es un punto de la curva; corre varios para acotar la rodilla.

Antes de medir, calienta con un `smoke`: la JVM recién arrancada rinde mucho menos durante los primeros minutos.
Para medir justamente eso, `coldstart` reinicia el API y el worker, anota en `run.txt` cuánto tardó cada uno en arrancar
(`started in`) y corre el escenario apenas responden (`PROFILE=constant RATE=700 DURATION=2m`, salvo que se indique otra cosa).
Las corridas de `public-api` encolan más de lo que el worker procesa; `bench/bench.sh drain` borra ese backlog
para que no afecte la corrida siguiente. `SEARCH_WEIGHT` (15) define qué parte de `console-api` son búsquedas.

Umbrales: p95 < 500 ms para llamadas al API y < 1 s para páginas; menos del 1% de requests y checks fallidos; k6
debe iniciar al menos el 99% de las iteraciones pedidas (`dropped_iterations`), y en `end-to-end` la DIAN debe aceptar
más del 99% de las facturas (`accepted`). La capacidad máxima de una superficie es la mayor `RATE` sostenida
que los cumple todos.

### Latencia de la DIAN

El mock responde al instante por defecto. La DIAN real tarda entre 1 y 3 s, y el worker procesa en serie, así
que conviene correr `end-to-end` con ambas latencias:

```sh
make bench SCENARIO=end-to-end RATE=1 DURATION=5m                       # mock instantáneo
DIAN_LATENCY=PT1.5S make bench SCENARIO=end-to-end RATE=1 DURATION=5m   # aproximación a la DIAN
bench/bench.sh latency PT0S                                             # volver a instantáneo
```

### Comparar versiones

Para comparar dos versiones de los servicios (un JVM, un flag, un cambio de código) hay dos scripts:

- `bench/baseline.sh <etiqueta>` corre siempre la misma batería sobre el stack actual (~50 min): `coldstart`,
  `public-api` a 1200/s, `console-api` a 400/s, `end-to-end` a 40/s y los soaks de 15 min de `public-api` y `mixed`.
  Anota cada medición en `bench/results/baseline-index.txt`.
- `bench/compare.sh "etiqueta:tag:JAVA_OPTS" ...` recrea el stack desde cero para cada variante (`down -v`, `up`,
  `seed`), así todas ven los mismos datos. Corre `baseline.sh` con las imágenes `cetus-bench-api:<tag>` y
  `cetus-bench-worker:<tag>`, que se construyen antes.

Para que las corridas sean comparables:

- Durante `public-api` y `console-api` el worker queda detenido. En Railway cada servicio tiene su vCPU; aquí su
  backlog le quitaría CPU al host al API y llenaría la memoria de LocalStack.
- Entre corridas hay 45 s de pausa, para que una corrida que satura no afecte a la siguiente.
- La batería aborta si LocalStack se reinicia o si un `end-to-end` de prueba no acepta documentos.

### Palancas sin recompilar

Variables leídas por `bench/docker-compose.yml`, que se aplican con `bench/bench.sh up`:
`BENCH_JOBS_CONCURRENCY` (12), `BENCH_JOBS_LIMIT_PROCESS_DOCUMENT` (8), `BENCH_JOBS_POLL_INTERVAL` (2s), `BENCH_JAVA_OPTS`,
`BENCH_RATE_LIMIT_RPS`/`BENCH_RATE_LIMIT_BURST` (el límite por API key está desactivado por defecto para medir el
servidor; en producción es 10/s con ráfaga de 20) y `BENCH_POSTGRES_CPUS` (2).

## Supuestos y límites

- **Postgres es local** (2 CPU, sin red) y en producción es PlanetScale a través de la red. Cada round trip real
  cuesta más, así que estos números son una **cota optimista**.
- **Los pools pasan por PgBouncer**, como en producción (`pgbouncer`, modo transacción, 20 conexiones al servidor por
  usuario y base). Flyway y el `LISTEN` del worker van directo a Postgres. Las corridas anteriores a este cambio iban
  todas directo, así que no son comparables una a una.
- La carga se genera en la misma máquina. Los límites de Docker aíslan a los servicios medidos, pero vigila
  que k6 no sature la CPU del host (`top`); si lo hace, la cifra es del generador, no de Cetus.
- No se envían correos (sin `RESEND_API_KEY`). Aun así, el worker genera el PDF y el AttachedDocument de cada
  documento aceptado antes de marcar la entrega como SKIPPED, así que su costo de CPU sí se mide.
- Las emisiones de un mismo emisor se serializan en el lock de su rango de numeración (`SELECT ... FOR
  UPDATE`). El seed crea 5 emisores (`BENCH_ORGS`); con un único emisor la recepción sería menor.
- LocalStack no guarda estado. Si su contenedor se reinicia (por ejemplo, porque `up` recrea servicios después
  de cambiar el compose), se pierden la llave KMS y los certificados en S3, y el worker falla con `NoSuchKey`.
  En ese caso, `bench/bench.sh down -v`, `make bench-up` y `make bench-seed`.
- Las cookies de sesión de `.state.json` duran lo que dura una sesión de Better Auth (7 días). Si vencen, vuelve a correr `make bench-seed`.

## Resultados (2026-10-21)

Corridas en un Mac de 14 núcleos con Docker al que se le asignaron 7,7 GB. Se usaron 5 tenants y ~52 000 documentos por cuenta
(~262 000 en total, porque las corridas de recepción dejan sus documentos), con perfiles `constant` de 2 minutos y el
API ya caliente. La capacidad es la mayor tasa sostenida con p95 dentro del umbral y sin `dropped_iterations`.

| Superficie | Capacidad sostenida | Qué se satura primero | Evidencia |
|---|---|---|---|
| API pública `/v1` (25% emisión) | **~1200 req/s** (≈300 facturas/s recibidas) | CPU del API | 1200/s: p95 2,7 ms, API 64%. 1400/s: CPU 100%, el throughput cae a ~965/s y el p95 sube a 1,95 s |
| API de consola `/console` (mezcla con 15% de búsqueda) | **~110 req/s** | **Postgres** (2 CPU al 100%) | Sin búsqueda (`SEARCH_WEIGHT=0`) llega a 600 req/s (p95 2,3 ms, API 49%) |
| Páginas SSR de la consola | **~75 páginas/s** | CPU de la consola (Node, 1 hilo) | 75/s: p95 98 ms, CPU 85%. 100/s: CPU 100%, p95 8,9 s |
| Todo mezclado (60/25/15) | **~300 req/s** | Consola (88%) y Postgres (99% p90) | 300/s: p95 de 3,6 ms en `/v1`, 101 ms en `/console` y 73 ms en páginas |
| **Worker, de punta a punta** (config actual) | **~1,4 docs/s** con el mock instantáneo, **~0,5 docs/s** con la DIAN a 1,5 s | **Configuración del polling**, no la CPU (worker al 5%) | A 2/s el backlog crece sin parar y el p95 llega a 52 s |
| Worker con `poll-interval=200ms`, `batch-size=20` | **~12–14 docs/s** con el mock instantáneo | Procesamiento en serie (CPU al 14%) | 8/s: p95 1,1 s. 20/s: el backlog crece |

### Hallazgos

1. **El cuello de botella del producto es el worker, no el API.** El API recibe ~300 facturas/s y el worker
   procesa 1,4/s. Cada documento genera dos jobs (`PROCESS_DOCUMENT` y `DELIVER_DOCUMENT`), y el runner toma 5 cada 2 s
   y los ejecuta en serie. Con la DIAN real (1–3 s por envío) el techo baja a unos 0,5 docs/s, es decir
   ~1800 facturas por hora. Un cliente que emita en lote verá esperas de minutos.
2. **Con solo ajustar la configuración, el worker rinde ~9× más** (`cetus.jobs.poll-interval`, `cetus.jobs.batch-size`), sin
   cambiar código ni recursos. El siguiente techo es la ejecución en serie, que deja la CPU casi ociosa
   mientras espera E/S. Con latencia de la DIAN, lo que escala es procesar varios jobs a la vez (p. ej. virtual threads
   por job reclamado) o tener más réplicas del worker (el claim con `SKIP LOCKED` ya lo permite).
3. **La búsqueda de la consola recorre toda la tabla.** `pageForAccount` con `q` usa `ILIKE '%…%'` sobre cuatro
   expresiones, así que Postgres hace un *parallel seq scan* de `billing.documents` completo (todas las cuentas): 161 ms y
   3 procesos por búsqueda con 262 000 filas. Su costo crece con el total de la plataforma. Bastan ~17 búsquedas/s
   para saturar 2 CPU de Postgres. Solución típica: índices GIN `pg_trgm` sobre esas expresiones.
4. **La consola es la superficie más chica:** ~75 páginas/s por CPU, y en carga su memoria llegó a 400 MB
   de 512 MB. Equivale a unos cientos de personas usándola a la vez, pero es lo primero que se satura con tráfico mixto.
5. **El arranque en frío pesa.** Las primeras corridas, con la JVM recién iniciada, tuvieron picos de 2–4,6 s a 700–850
   req/s, que desaparecieron al repetirlas. Después de cada despliegue en Railway, los primeros minutos rinden bastante menos.
6. **Better Auth limita `/api/auth/*` por IP** (~10/s). En producción no afecta, porque la consola emite el JWT en
   proceso, pero obliga a que k6 reparta las renovaciones de token (`setup()` en `lib/flows.js`).

### Después de los cambios (índice de búsqueda y worker concurrente)

Mismo stack y datos. Cambios: migración V14, que agrega un índice trigram para la búsqueda y `(account_id, id DESC)` para paginar; worker
con 8 jobs simultáneos (`cetus.jobs.concurrency`) que arranca cada job apenas se encola (`LISTEN/NOTIFY`, migración V15).

| Superficie | Antes | Después |
|---|---|---|
| API de consola con 15% de búsqueda | ~110 req/s (p95 206 ms a 100/s, Postgres al 100%) | **~400–500 req/s** (p95 8,8 ms a 400/s; ahora limita la CPU del API) |
| Una búsqueda (`q=Cliente 42`, 262 000 filas) | 161 ms, seq scan con 3 procesos | 18,8 ms con el índice (1,2 ms buscando un número) |
| Worker, mock instantáneo | 1,4 docs/s, ~2 s de espera por el polling | **~60–70 docs/s** (CPU al 100% a 70/s); p95 de 29 ms hasta la validación a 20/s |
| Worker, DIAN a 1,5 s | 0,5 docs/s | **~5 docs/s** con concurrencia 8; **16 docs/s** con concurrencia 32 (CPU 23%) |

Con latencia de la DIAN, el throughput ≈ concurrencia ÷ tiempo de respuesta de la DIAN. Para subir la concurrencia,
sube el pool junto con ella (`CETUS_DB_POOL_SIZE` ≥ concurrencia + 4). Con concurrencia 32 y un pool de 20, un arranque en frío
con backlog saturó la CPU, alargó las transacciones y agotó el pool (*acquisition timeout*).

### Siguientes pasos sugeridos

- Correr `soak` (15 min) en `public-api` y en `mixed` para revisar memoria y GC sostenidos.
- Repetir con latencia de red hacia Postgres (p. ej. `toxiproxy` o `tc netem` de 5–10 ms) para aproximar PlanetScale.
- Medir de nuevo después de ajustar el worker y de agregar el índice de búsqueda.
