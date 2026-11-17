# Memoria del API: JVM y nativo

Línea base para compilar el API en nativo (`plan-ejecucion-quarkus-nativo.md`). Cada variante corre en el stack de
`bench/` con 1 vCPU y 1 GB, con 5 tenants y ~20 000 documentos sembrados, y el worker detenido durante las
corridas del API. Mac de 14 núcleos, Docker con 7,7 GB.

Batería, en este orden: `smoke` de `public-api`, reposo de 60 s, `bench/certificate-peak.sh` (la matriz de
`modules/signing` cinco veces), `load` de `public-api` a 1200/s, `load` de `console-api` a 400/s, `soak` de
`public-api` a 1200/s durante 30 min (840/s), reposo de 60 s y reinicio del API.

«Contenedor» es `memory.current` del cgroup (lo que cuenta para el límite); «RSS» es el del proceso.

| Métrica | API JVM |
|---|---|
| Reposo tras el smoke | 352 MiB contenedor, 372 MiB RSS |
| Pico al cargar `.p12` | 355 MiB (+5); el de 1M iteraciones se rechaza con 422 |
| Máximo bajo `load` de `public-api` | 753 MiB |
| Máximo bajo `load` de `console-api` | 838 MiB |
| Final del soak | 926 MiB contenedor, 914 MiB RSS (máximo 920 MiB en la corrida) |
| Reposo tras el soak | 927 MiB: la JVM no devuelve la memoria |
| p95 `public-api` (load / soak) | 12,05 ms / 2,84 ms, 0 errores |
| p95 `console-api` (load) | 6,4 ms, 0 errores |
| Listo tras reiniciar | 4 s (`/q/health/ready`; con logs en WARN no se ve el `started in`) |
| Recién arrancado | 333 MiB contenedor |
| Imagen | 746 MB |

En el soak de la JVM k6 descartó 341 iteraciones (0,19/s) de 1,5 millones.

- `jvm-memory.txt`: mediciones de la batería, en el orden en que se tomaron.
- `jvm-runs.txt`: CPU y memoria máxima del API y p95 de cada corrida (`bench/results/`, no versionado).
