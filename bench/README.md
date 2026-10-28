# Benchmark de capacidad

Mide cuánto aguanta Cetus con los recursos que tiene en Railway (`.railway/railway.ts`): el API y el worker con
1 vCPU / 1 GB cada uno y la consola con 1 vCPU / 512 MB. Corre las imágenes de producción (no `quarkusDev`) con
esos límites, contra el mock de la DIAN, y genera la carga con [k6](https://k6.io).

## Uso

```sh
mise install           # incluye k6
mise run bench-up      # construye y levanta el stack (proyecto cetus-bench, puertos propios: convive con mise run dev-mock)
mise run bench-seed    # organizaciones, emisores, API keys (bench/.state.json) e historial de documentos
PROFILE=smoke mise run bench public-api
PROFILE=load RATE=200 mise run bench public-api
mise exec -- bench/bench.sh drain   # entre corridas: vacía la cola que dejó la anterior
mise run bench-coldstart public-api   # reinicia el API y el worker y los carga en frío (700/s durante 2 min)
mise run bench-down    # bench/bench.sh down -v borra también su base de datos
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

`end-to-end` siempre mantiene `RATE` constante durante `DURATION` (5m por defecto); en ese escenario
`PROFILE` solo nombra la carpeta, no aplica los escalones anteriores. Para un calentamiento corto usa
`RATE=2 DURATION=1m`.

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

El mock responde al instante por defecto. La latencia limita los slots de procesamiento del worker; conviene correr `end-to-end` con ambas latencias:

```sh
RATE=1 DURATION=5m mise run bench end-to-end                       # mock instantáneo
DIAN_LATENCY=PT1.5S RATE=1 DURATION=5m mise run bench end-to-end   # aproximación a la DIAN
mise exec -- bench/bench.sh latency PT0S                                        # volver a instantáneo
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
`BENCH_JOBS_CONCURRENCY` (12), `BENCH_JOBS_LIMIT_PROCESS_DOCUMENT` (8), `BENCH_JOBS_POLL_INTERVAL` (2s), `BENCH_DB_POOL_SIZE` (20), `BENCH_JAVA_OPTS`,
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
  En ese caso, `bench/bench.sh down -v`, `mise run bench-up` y `mise run bench-seed`.
- Las cookies de sesión de `.state.json` duran lo que dura una sesión de Better Auth (7 días). Si vencen, vuelve a correr `mise run bench-seed`.

## Resultados (2026-10-21)

Corridas en un Mac de 14 núcleos con Docker al que se le asignaron 7,7 GB. Se usaron 5 tenants y ~52 000 documentos por cuenta
(~262 000 en total, porque las corridas de recepción dejan sus documentos), con perfiles `constant` de 2 minutos y el
API ya caliente. La capacidad es la mayor tasa sostenida con p95 dentro del umbral y sin `dropped_iterations`.
En estas corridas históricas del worker, «end-to-end» terminaba en el veredicto DIAN; no esperaba finalizar la entrega.

| Superficie | Capacidad sostenida | Qué se satura primero | Evidencia |
|---|---|---|---|
| API pública `/v1` (25% emisión) | **~1200 req/s** (≈300 facturas/s recibidas) | CPU del API | 1200/s: p95 2,7 ms, API 64%. 1400/s: CPU 100%, el throughput cae a ~965/s y el p95 sube a 1,95 s |
| API de consola `/console` (mezcla con 15% de búsqueda) | **~110 req/s** | **Postgres** (2 CPU al 100%) | Sin búsqueda (`SEARCH_WEIGHT=0`) llega a 600 req/s (p95 2,3 ms, API 49%) |
| Páginas SSR de la consola | **~75 páginas/s** | CPU de la consola (Node, 1 hilo) | 75/s: p95 98 ms, CPU 85%. 100/s: CPU 100%, p95 8,9 s |
| Todo mezclado (60/25/15) | **~300 req/s** | Consola (88%) y Postgres (99% p90) | 300/s: p95 de 3,6 ms en `/v1`, 101 ms en `/console` y 73 ms en páginas |
| **Worker, de punta a punta** (configuración del 21, antes de concurrencia) | **~1,4 docs/s** con el mock instantáneo, **~0,5 docs/s** con la DIAN a 1,5 s | **Configuración del polling**, no la CPU (worker al 5%) | A 2/s el backlog crece sin parar y el p95 llega a 52 s |
| Worker con `poll-interval=200ms`, `batch-size=20` | **~12–14 docs/s** con el mock instantáneo | Procesamiento en serie (CPU al 14%) | 8/s: p95 1,1 s. 20/s: el backlog crece |

### Hallazgos del 21 de octubre, antes de concurrencia e índices

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

Con latencia de la DIAN, el techo de aceptación ≈ slots de procesamiento ÷ tiempo de respuesta de la DIAN. La generación de artefactos y la entrega tienen su propia cola y pueden limitar el resultado antes. Para subir la concurrencia,
sube el pool junto con ella (`CETUS_DB_POOL_SIZE` ≥ concurrencia + 4). Con concurrencia 32 y un pool de 20, un arranque en frío
con backlog saturó la CPU, alargó las transacciones y agotó el pool (*acquisition timeout*).

## Resultados guardados del 22 de octubre de 2026

Las corridas del 22 ya incluyen soaks de `public-api` y `mixed`: por ejemplo,
[`150801-public-api-soak`](results/20261022-150801-public-api-soak/) y
[`152350-mixed-soak`](results/20261022-152350-mixed-soak/), además de las variantes del
[índice de baterías](results/baseline-index.txt). No están versionadas; permanecen en el directorio local de resultados.

| DIAN | Tasa solicitada | Throughput observado | p95 hasta validación | Resultado | Evidencia |
|---|---:|---:|---:|---|---|
| Instantánea | 40 docs/s | 39,68 docs/s | 86 ms | 4 800 aceptados, sin rechazos | [150511](results/20261022-150511-end-to-end-constant/) |
| 1,5 s | 15 docs/s | 14,84 docs/s | 1 537 ms | 2 701 aceptados | [163325](results/20261022-163325-end-to-end-constant/) |
| 1,5 s | 20 docs/s | 19,78 docs/s | 1 579 ms | 3 601 aceptados | [163658](results/20261022-163658-end-to-end-constant/) |
| 1,5 s | 25 docs/s | 20,56 docs/s | 34 626 ms | Falla el umbral de latencia y crece la cola | [164031](results/20261022-164031-end-to-end-constant/) |

**Los 20 docs/s con 1,5 s de DIAN usaron concurrencia total 36, procesamiento 32 y pool 40.**
No corresponden a la configuración actual 12/8, pool 20. Estas corridas esperaban aceptación;
no verificaban la finalización de entrega ni los dos artefactos, así que no demuestran 20 entregas/s.
Las corridas con cero aceptaciones que también hay en `results/` son fallos de ejecución, no capacidad.

## Comparación del worker de octubre de 2026

El worker usa tres cachés independientes: certificados (512 entradas), credenciales (1 024: PIN y clave
técnica de cada emisor) y webhooks (512), con TTL de 10 minutos y barrido cada minuto. Las variables
`CETUS_CACHE_CERTIFICATES_MAX_ENTRIES`, `CETUS_CACHE_CREDENTIALS_MAX_ENTRIES` y `CETUS_CACHE_WEBHOOKS_MAX_ENTRIES`
cambian las capacidades. Mantenlas por encima de los emisores y endpoints activos: un LRU recorrido en rotación
por más claves de las que guarda falla en cada acceso (ver «Más emisores que entradas de caché»).
La huella del contenido sellado invalida la reutilización después de una rotación. El certificado SANDBOX
reemplazado en la misma ubicación se actualiza por TTL.

La reconstrucción agrupa los impuestos por línea en una pasada. Una factura TEST sin conjunto de pruebas
requiere 5 consultas para el contexto de procesamiento (antes: 8) y 4 para el de entrega (antes: 8).
Las pruebas con 2, 100 y 500 líneas verifican que esas cantidades son constantes. No incluyen las escrituras
ni las otras transacciones de un job. Una nota añade la consulta de su referencia y un conjunto TEST activo
puede añadir la consulta de habilitación. Entrega ya no consulta PIN, clave técnica ni historial de envíos DIAN.

### Referencia medida el 27 de octubre

Base `0ae61bf02fc2c975950cbb1c0162229e1dc9cecf` frente a las imágenes del código nuevo, con el mismo
snapshot inicial (~104 mil documentos), cinco emisores TEST, dos líneas, 2 docs/s, concurrencia 12/8,
entrega 2 y pool 20. Cada punto tiene tres repeticiones válidas de dos minutos, después del calentamiento.
Las columnas de latencia son la mediana de los p95 de cada repetición; SQL y KMS se normalizan por documento.

| DIAN / variante | p95 validación | p95 entrega observada | SQL/doc (stack) | KMS/doc | RSS máximo del worker |
|---|---:|---:|---:|---:|---:|
| Instantánea / base | 66 ms | 1 035 ms | 85,70 | 2,000 | 381,3 MiB |
| Instantánea / nueva | 56 ms | 1 036 ms | 78,68 | 0,000 | 413,9 MiB |
| 1,5 s / base | 1 558 ms | 2 037 ms | 94,70 | 2,014 | 350,8 MiB |
| 1,5 s / nueva | 1 564 ms | 2 041 ms | 87,71 | 0,028 | 445,4 MiB |

Todas las muestras válidas tuvieron 100% de aceptación, entregas `SKIPPED` y ambos artefactos registrados,
sin cola pendiente acumulada de procesamiento ni entrega. El throughput de iteraciones, incluyendo el polling
final, fue ~1,99 docs/s con DIAN instantánea y ~1,97 con 1,5 s.
La reducción de KMS en las ventanas medidas fue del 99,3%; la variante nueva descifró nuevamente al cruzar el TTL.
No se incluyen las cargas iniciales del calentamiento.

La mejora de latencia se observa con DIAN instantánea. Con 1,5 s no se confirmó una mejora; la entrega permanece
dominada por la resolución del polling. El RSS fue mayor en la variante nueva: estas muestras no demuestran
una reducción de memoria con cinco emisores. La cota, limpieza y recuperación de los cachés se demuestran con
pruebas controladas. Se conservan los cambios por corregir retención y complejidad, reducir consultas y ahorrar KMS.
Estos puntos a 2 docs/s no establecen una nueva capacidad máxima.

Datos numéricos versionados: [reference.csv](evidence/2026-10-27-worker/reference.csv).
Corridas completas: [índice principal](results/worker-reference-20261027-163206.tsv) y
[repetición adicional](results/worker-reference-20261027-170159.tsv). La primera muestra base instantánea
se descartó por un error del script al terminar y se repitió desde el mismo snapshot; se conserva con exit code 2.
Los CSV también registran CPU, GC y máximos de cola; los logs y las muestras crudas están en las carpetas enlazadas.

Contabilización LIVE aislada: tres repeticiones tras calentamiento, 32 aceptaciones concurrentes y conteos exactos.

| Cuentas | p95 transacción base / nueva (mediana) | Espera agregada estimada base / nueva (mediana) |
|---|---:|---:|
| 1 | 76,6 / 76,0 ms | 948,4 / 973,7 ms |
| 16 | 19,1 / 20,1 ms | 145,1 / 142,8 ms |

No se cambió la contabilización ni se confirmó una mejora en ella. Hay contención al concentrar las aceptaciones
en una cuenta, con exactitud y deduplicación preservadas. La espera es un muestreo agregado de conexiones,
no duración por lock. [billing.csv](evidence/2026-10-27-worker/billing.csv) conserva también la repetición 0 de calentamiento.

### Curva con DIAN a 1,5 s, configuración 12/8

Tres muestras de 30 s por tasa y variante. Todas aprobaron los umbrales de k6 y terminaron con aceptación,
artefactos y entregas correctos, pero a 6 y 8 docs/s la cola de procesamiento creció durante la llegada.
Esperar a que se vacíe después no convierte esas tasas en sostenibles.

| Oferta | p95 validación base / nueva (mediana) | Máximo pendiente de procesamiento base / nueva | Observación |
|---:|---:|---:|---|
| 2 docs/s | 1 560 / 1 567 ms | 0 / 0 | Sin cola pendiente en estas ventanas |
| 4 docs/s | 1 555 / 1 555 ms | 0 / 0 | Sin cola pendiente en estas ventanas |
| 5 docs/s | 1 548 / 1 542 ms | 0 / 0 | Mayor punto probado sin cola pendiente |
| 6 docs/s | 5 840 / 5 745 ms | 26 / 21 | Cola creciente |
| 8 docs/s | 16 653 / 16 396 ms | 78 / 80 | Cola creciente |

No se confirmó un aumento del techo de esta configuración: ambas variantes quedan entre 5 y 6 docs/s
con la DIAN simulada a 1,5 s. La estabilidad de 5 docs/s todavía necesita las pruebas prolongadas.
La cola de entrega no mostró crecimiento sostenido en estas muestras.
[Datos](evidence/2026-10-27-worker/curve.csv), [serie de colas con llegada y drenaje separados](evidence/2026-10-27-worker/curve-backlog.csv)
y [corridas completas](results/worker-curve-20261027-171959.tsv).

### Documentos grandes

Tres repeticiones de 30 s por tamaño y variante, a 2 docs/s y DIAN instantánea, con el mismo snapshot,
configuración y calentamiento que la referencia. Son comparaciones cortas, sin prueba de estabilidad prolongada.

| Líneas | p95 validación base / nueva | p95 entrega base / nueva | CPU media del worker base / nueva (mediana) | RSS máximo base / nueva |
|---:|---:|---:|---:|---:|
| 2 | 64 / 47 ms | 1 041 / 1 035 ms | 12,4% / 10,1% | 315 / 313 MiB |
| 100 | 61 / 54 ms | 1 043 / 1 041 ms | 10,4% / 10,5% | 341 / 339 MiB |
| 500 | 138 / 91 ms | 1 109 / 1 063 ms | 13,7% / 11,0% | 678 / 674 MiB |

Las 18 muestras pasaron aceptación, artefactos y entrega, sin cola pendiente acumulada. Con 500 líneas se
observó menor latencia y CPU; con 100 líneas no se confirmó ahorro de CPU. La memoria máxima fue similar en
estas ventanas. El p95 de validación incluye cola, reconstrucción, UBL, firma, S3 y DIAN; no aísla el tiempo
de reconstrucción ni de construcción UBL. Los contadores SQL del stack crecen con las líneas por las inserciones
del API; las pruebas de contexto verifican por separado 5/4 consultas constantes, sin N+1.
[large.csv](evidence/2026-10-27-worker/large.csv) y [corridas completas](results/worker-large-20261027-170718.tsv).

### Configuración histórica 36/32, pool 40

Tres muestras de 30 s por tasa y variante, DIAN a 1,5 s, cinco emisores y dos líneas. Las medianas de p95 y
CPU son por repetición; el RSS y la cola son máximos de las tres.

| Oferta | Throughput base / nueva | p95 validación base / nueva | CPU media del worker base / nueva | RSS máximo base / nueva | Máximo pendiente de procesamiento base / nueva |
|---:|---:|---:|---:|---:|---:|
| 15 docs/s | 14,08 / 14,09 | 1 550 / 1 548 ms | 35% / 40% | 491 / 496 MiB | 1 / 1 |
| 20 docs/s | 18,76 / 18,76 | 1 540 / 1 539 ms | 34% / 34% | 688 / 731 MiB | 0 / 0 |
| 25 docs/s | 19,74 / 19,73 | 7 165 / 7 173 ms | 31% / 30% | 692 / 752 MiB | 111 / 118 |

A 25 docs/s ambas variantes acumulan cola: el techo coincide con `PROCESS_DOCUMENT` / latencia de la DIAN
(32 / 1,5 s ≈ 21 docs/s), no con la CPU, que se queda en un tercio de la vCPU. El recurso que más se acerca
a su límite es la memoria: ~750 MiB de 1 GiB. La variante nueva ahorra 2 descifrados KMS y ~7 consultas por
documento, sin cambiar el techo. 20 docs/s sigue sin soak que confirme su estabilidad.
[historical.csv](evidence/2026-10-27-worker/historical.csv),
[serie de colas](evidence/2026-10-27-worker/historical-backlog.csv) y
[corridas completas](results/worker-historical-20261027-174126.tsv).

### Más emisores que entradas de caché

257 emisores TEST, cada uno con un endpoint de webhook hacia un receptor local (`BENCH_WEBHOOKS=1`,
`BENCH_CLIENT_IPS=1`), 2 docs/s, dos líneas, DIAN instantánea y tres repeticiones de 3 min tras el
calentamiento. Las iteraciones rotan por todos los emisores, el peor caso para un LRU. Mismo snapshot para
las tres variantes. Medianas por repetición; KMS por documento con la suma de las tres.

| Variante | p95 validación | KMS/doc | KMS por repetición | CPU media | RSS máximo |
|---|---:|---:|---|---:|---:|
| Base (mapas sin límite, sin caché de credenciales) | 52 ms | 2,38 | 1 130 / 722 / 722 | 7,2% | 431 MiB |
| Nueva con 256 entradas por caché | 53 ms | 3,48 | 1 200 / 1 285 / 1 280 | 8,1% | 432 MiB |
| Nueva con 512 / 1 024 / 512 | 37 ms | 0,63 | 685 / 0 / 0 | 6,4% | 407 MiB |

Con 256 entradas, 257 emisores en rotación fallaban en cada acceso: la variante nueva descifraba **más** que
la base, porque además recargaba certificados y secretos de webhook, y las credenciales (dos entradas por emisor)
solo cabían para 128 emisores. Por eso los valores por defecto pasaron a 512 / 1 024 / 512. Con ellos, la
primera repetición llena las cachés y las siguientes no descifran nada. Todas las muestras aceptaron el 100%,
resolvieron la entrega y registraron los artefactos; los webhooks terminaron `SUCCEEDED`. La sustitución de IP
del seed solo funciona contra el stack local.
[caches.csv](evidence/2026-10-27-worker/caches.csv) (`new-256` es la primera corrida) y corridas completas:
[256](results/worker-caches-20261027-184859.tsv), [512/1 024/512](results/worker-caches-20261027-201317.tsv).

### Tiempo de construcción del documento (parcial)

`bench/build-timing.sh` exporta el span `document.build` a un receptor OTLP local que guarda solo tiempos.
Incluye el descifrado de credenciales cuando falla la caché, CUFE/CUDE y la construcción JAXB; excluye
contexto, firma, S3 y DIAN. La matriz se interrumpió: falta la tercera repetición nueva de 100 líneas y las
nuevas de 500.

| Líneas | p50 base / nueva | p95 base / nueva | Repeticiones base / nueva |
|---:|---:|---:|---:|
| 2 | 8,0 / 0,64 ms | 11,2 / 1,01 ms | 3 / 3 |
| 100 | 7,9 / 1,27 ms | 10,6 / 2,12 ms | 3 / 2 |
| 500 | 8,7 / — | 13,1 / — | 3 / 0 |

Casi todo el tiempo de la base es el descifrado KMS del PIN y la clave técnica (LocalStack local; en AWS cada
llamada cuesta más). Cada muestra capturó tantos spans como documentos aceptados.
[build-partial.csv](evidence/2026-10-27-worker/build-partial.csv) e [índice](results/worker-large-20261027-175526.tsv).

### Postgres remoto simulado

Solo el datasource del worker pasa por `bench/postgres-latency.mjs`, que retiene cada bloque 5 ms por dirección
(RTT medido con eco ≈ 12 ms). El API, las migraciones y LISTEN van directos. 2 docs/s, DIAN a 1,5 s, cinco
emisores, tres repeticiones de 2 min por variante y el mismo snapshot.

| Variante | p95 validación | p95 entrega observada | SQL/doc (stack) | KMS/doc | CPU media | RSS máximo |
|---|---:|---:|---:|---:|---:|---:|
| Base | 2 221 ms | 4 033 ms | 120,86 | 2,000 | 12,5% | 429 MiB |
| Nueva | 2 185 ms | 3 034 ms | 112,55 | 0,000 | 13,0% | 418 MiB |

Frente a la referencia sin proxy (1 558 / 1 564 ms), el RTT añade ~650 ms al p95 de validación: unas 55
idas y vueltas por documento en la ruta del worker. La variante nueva recorta 36 ms de validación; la entrega
cruza un tick menos del polling de 1 s, así que el ahorro real es menor de lo que sugiere la tabla. Todas las
muestras aceptaron el 100% y resolvieron la entrega. La conclusión para producción es mantener el worker y
Postgres/PgBouncer en la misma región: cada milisegundo de RTT pesa ~55 veces por documento.
[remote.csv](evidence/2026-10-27-worker/remote.csv) y [corridas completas](results/worker-remote-20261027-202356.tsv).

### Escalar a 2 vCPU o más

Con la DIAN simulada a 1,5 s, el worker no está limitado por la CPU: a 20 docs/s usa ~34% de una vCPU, y
el throughput sigue a `PROCESS_DOCUMENT` / latencia de la DIAN. Antes de añadir CPU:

- Sube juntos `CETUS_JOBS_LIMIT_PROCESS_DOCUMENT`, `CETUS_JOBS_CONCURRENCY` y `CETUS_DB_POOL_SIZE`
  (al menos concurrencia + 4), y comprueba las conexiones de PgBouncer.
- Vigila la memoria: con 36/32 el RSS llegó a ~750 MiB de 1 GiB, con `MaxRAMPercentage=40`.
- `apps/worker/Dockerfile` fija `-XX:+UseSerialGC` y entrena la caché AOT con ese GC. Con 2 vCPU o más
  conviene G1 o Parallel, y cambiarlo exige regenerar la AOT con el mismo GC. Con un GC distinto la JVM
  descarta la caché y el arranque es más lento.
- Ajusta las capacidades de las cachés a los emisores y endpoints activos.

Ninguna de estas configuraciones se ha medido todavía con 2 vCPU.

### Pendiente

- Soaks de 30 min con tres repeticiones por variante: candidatos 3,5 docs/s para 12/8 y 14 docs/s para 36/32.
  Ningún punto corto de esta página demuestra capacidad sostenida.
- Tasas fraccionarias en k6: `RATE` es entero; 3,5 docs/s requiere `rate`/`timeUnit` (35 por 10 s).
- La matriz de construcción completa (nuevas de 100 y 500 líneas).
- Mejoras no confirmadas: latencia con DIAN lenta, RSS con pocos emisores (subió en la referencia) y
  contabilización LIVE.

### Reproducir la comparación

Construye `cetus-bench-worker:performance-base` desde el commit base y
`cetus-bench-worker:performance-new` desde el código nuevo, usando `apps/worker/Dockerfile`.
Levanta el stack y ejecuta el seed. `BENCH_ORGS` controla cuántas organizaciones/emisores se crean;
`BENCH_HISTORY_PER_ISSUER` controla su historial. El seed fija su conexión en el Postgres aislado de puerto 5532.

```sh
mise exec -- bench/worker-comparison.sh reference
mise exec -- bench/worker-comparison.sh curve
mise exec -- bench/worker-comparison.sh historical
mise exec -- bench/worker-comparison.sh large
STABLE_RATE=4 mise exec -- bench/worker-comparison.sh remote
SOAK_RATE=3 mise exec -- bench/worker-comparison.sh soak
SOAK_RATE=14 mise exec -- bench/worker-comparison.sh soak-historical
```

Los valores de `STABLE_RATE` y `SOAK_RATE` son ejemplos: usa la tasa estable que hayas medido, y para el soak
el 70% de ella. `reference` prueba DIAN instantánea y 1,5 s; `curve`, 2/4/5/6/8 docs/s;
`historical`, 15/20/25 con 36/32 y pool 40; `large`, 2/100/500 líneas a 2 docs/s.
Cada grupo hace calentamiento de un minuto y tres repeticiones de dos minutos por punto
(`REPETITIONS`, `DURATION_POINT`). Los soaks duran 30 minutos por repetición.

El script restaura el mismo snapshot de Postgres para ambas variantes, conserva LocalStack y sus claves,
y espera la cola vacía entre corridas. Solo detiene y restaura servicios del proyecto `cetus-bench`.
No cambia concurrencia ni recursos de producción. El snapshot sintético queda en `/tmp/cetus-worker-comparison.*`
y el índice de resultados en `bench/results/worker-*.tsv`.

Para una corrida individual: `LINES=500 ISSUERS=5 WAIT_DELIVERY=1 RATE=2 DURATION=2m mise run bench end-to-end`.
`ISSUERS` selecciona los primeros emisores del seed en rotación por iteración, incluso con pocos VUs.
`WAIT_DELIVERY=1` exige aceptación, entrega resuelta como `SKIPPED` y registros de ambos artefactos.
`REQUIRE_SKIPPED=0` permite también `SENT`/`DELIVERED` para un entorno de prueba con correo.
La validación se mide con timestamps del servidor; la finalización de entrega se observa por polling y tiene
la resolución de `POLL_SECONDS` (1 s). Los enlaces de archivos confirman sus registros; las pruebas funcionales
abren y verifican el PDF, XML y ZIP.

`run.txt` registra SHA, huella del diff, imágenes, JVM, límites y configuración efectiva de jobs/cachés/pool.
`sql-before.csv` y `sql-after.csv` contienen contadores por queryid de `pg_stat_statements`, sin SQL ni parámetros;
incluyen el stack completo, también el polling de k6, y no equivalen a consultas exclusivas del worker.
`kms.txt` cuenta `kms.Decrypt` del LocalStack durante la corrida. Los logs de servicios se limitan a la ventana
medida; la comparación habilita `-Xlog:gc`. CPU, memoria y colas se siguen muestreando cada 5 s.

```sh
mise exec -- node bench/lib/worker-summary.mjs bench/results/worker-reference-<fecha>.tsv
```

El grupo `remote` pasa exclusivamente el datasource del worker por un proxy TCP local: retiene cada bloque
5 ms en cada dirección (aproximadamente 10 ms por request/response), entre el worker y PgBouncer.
El API, las migraciones y LISTEN conservan sus rutas. Es latencia artificial de aplicación, no una simulación
de pérdida de paquetes, jitter ni de toda la red de producción.

Para medir solo la contabilización LIVE, con Postgres de Dev Services y veredictos DIAN locales:

```sh
CETUS_BILLING_BENCH=true QUARKUS_HTTP_TEST_PORT=0 mise exec -- ./gradlew :apps:worker:test --tests '*BillingAccountingBenchmarkTest'
```

La repetición 0 calienta; las otras tres comparan 32 aceptaciones de una cuenta frente a 16 cuentas.
`p95_transaction_ms` incluye adquisición de conexión, espera y commit; `lock_wait_ms_estimated` suma
conexiones bloqueadas por el intervalo entre muestras de `pg_stat_activity` (~2 ms más la consulta).
Es una estimación agregada de espera, no instrumentación exacta de cada lock ni capacidad end-to-end LIVE.

### Siguientes pasos

Los índices de búsqueda, `LISTEN/NOTIFY`, la concurrencia, los cachés acotados y el agrupamiento de impuestos
ya están implementados. La capacidad debe evaluarse con aceptación **y** finalización de entrega: un umbral de
aceptación aprobado con cola de entrega creciente no es sostenible. Conserva las mediciones fallidas junto a
las exitosas y comprueba los soaks del worker antes de proponer otra concurrencia.

Todos estos escenarios usan DIAN simulada, KMS/S3 de LocalStack y omiten correos reales. TEST no ejerce la
contabilización ni los locks de cuota de LIVE; sus números no deben presentarse como capacidad LIVE.
