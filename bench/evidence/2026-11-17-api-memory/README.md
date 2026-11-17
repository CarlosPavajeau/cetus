# Memoria del API: JVM y nativo

Evidencia para compilar el API en nativo (`plan-ejecucion-quarkus-nativo.md`). Cada variante corre en el stack de
`bench/` recién creado (`down -v`, `up`, `seed`: 5 tenants y ~20 000 documentos), con 1 vCPU y el worker detenido
durante las corridas del API. Mac de 14 núcleos, Docker con 7,7 GB.

Batería, en este orden: `smoke` de `public-api`, reposo de 60 s, `bench/certificate-peak.sh` (la matriz de
`modules/signing` cinco veces), `load` de `public-api` a 1200/s, `load` de `console-api` a 400/s, `soak` de
`public-api` a 1200/s durante 30 min (840/s), reposo de 60 s y reinicio del API.

«Contenedor» es `memory.current` del cgroup (lo que cuenta para el límite); el máximo de cada corrida sale de
`docker stats`, que no cuenta la caché de páginas.

| Métrica | JVM (1 GB, `MaxRAMPercentage=40`) | Nativo (512 MB, `-Xmx384m -Xmn256m`) |
|---|---|---|
| Reposo tras el smoke | 352 MiB | 126 MiB |
| Pico al cargar `.p12` | 355 MiB (+5) | 133 MiB (+5) |
| Máximo bajo `load` de `public-api` | 753 MiB | 372 MiB |
| Máximo bajo `load` de `console-api` | 838 MiB | 229 MiB |
| Final del soak (máximo en la corrida) | 926 MiB (920) | 161 MiB (129) |
| Reposo tras el soak | 927 MiB: la JVM no la devuelve | 152 MiB |
| Recién arrancado | 333 MiB | 77 MiB |
| p95 `public-api`, `load` hasta 1200/s | 12,05 ms, CPU p90 74 %, 1 231 descartadas | 378,94 ms, CPU p90 99 %, 8 014 descartadas |
| p95 `console-api`, `load` hasta 400/s | 6,4 ms, CPU p90 41 % | 6,23 ms, CPU p90 59 % |
| p95 `public-api`, soak a 840/s | 2,84 ms, 341 descartadas de 1,5 M | 3,74 ms, 319 descartadas de 1,5 M |
| Errores | 0 | 0 |
| Listo tras reiniciar | 4 s | 1 s |
| Imagen | 746 MB | 266 MB |

El nativo usa entre un 60 % y un 85 % menos memoria y devuelve la que deja de usar. A cambio gasta más CPU por
request (Mandrel solo tiene Serial GC y no tiene PGO): a 1200/s de `public-api` llega al 100 % de su vCPU, donde la
JVM iba al 74 %. Por debajo de ~1000/s las latencias son equivalentes.

## Calibración del heap

Con `-Xmx128m` (`native-128m-*.txt`, contenedor de 1 GB) el recolector corría casi sin pausa y la CPU se saturaba
antes. Corridas de 1 min a tasa fija probaron 256, 384 y 512 MB con heaps de 128 a 384 MB: un young generation
grande (`-Xmn`) es lo que más baja la CPU. Con 512 MB y `-Xmx384m -Xmn256m` pasaron `console-api` a 400/s (p95 80 ms)
y `public-api` a 1200/s (p95 8,9 ms); con 256 y 384 MB alguna de las dos se saturaba.

Ojo al comparar: cada corrida de `public-api` deja sus documentos (~80 000 por `load`). Una primera batería del nativo
a 512 MB corrió con 1 millón de documentos y Postgres (2 CPU) limitó `console-api`; se descartó y se repitió sobre un
stack nuevo.

- `jvm-memory.txt`, `native-memory.txt`: mediciones de cada batería, en el orden en que se tomaron.
- `jvm-runs.txt`, `native-runs.txt`: CPU y memoria máxima del API, p95 y descartadas de cada corrida
  (`bench/results/`, no versionado).
- `native-128m-*.txt`: la primera batería del nativo, con `-Xmx128m` y 1 GB.
