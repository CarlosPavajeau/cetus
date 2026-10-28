# Evidencia numérica del worker

Datos agregados sin cuerpos, credenciales, SQL ni parámetros. Los logs y muestras crudas permanecen en los directorios locales `bench/results/` que cita cada fila; no están versionados.

- `metadata.json`: commit base, imágenes exactas, huellas del código del worker y configuración.
- `reference.csv`: referencia a 2 docs/s, tres muestras válidas de dos minutos por variante y latencia. La fila con exit code 2 se excluye del análisis y tiene una repetición adicional.
- `curve.csv` y `curve-backlog.csv`: curva 2/4/5/6/8 docs/s con 1,5 s de DIAN, separando llegada y drenaje.
- `large.csv`: documentos de 2/100/500 líneas, tres muestras de 30 segundos por variante y tamaño.
- `historical.csv` e `historical-backlog.csv`: 15/20/25 docs/s con 36/32 y pool 40, DIAN a 1,5 s.
- `caches.csv`: 257 emisores con webhooks; `new-256` es la variante nueva con 256 entradas por caché, `new` con 512/1 024/512.
- `build-partial.csv`: tiempos de `document.build` de una matriz interrumpida; no es una matriz completa.
- `remote.csv`: 2 docs/s con el datasource del worker detrás de un proxy de 5 ms por dirección.
- `billing.csv`: contabilización LIVE aislada con Postgres real; la repetición 0 calienta y se excluye de las medianas. Los veredictos son locales; no es capacidad LIVE end-to-end.

Los p95 de las tablas del README principal son medianas de los p95 de las repeticiones, no el p95 de todas las observaciones combinadas. SQL/KMS por documento se calculan con la suma de llamadas dividida por la suma de documentos. SQL incluye todo el stack y el polling. La entrega se observa por polling de un segundo y exige SKIPPED y registros de PDF y AttachedDocument.

No se debe inferir una nueva capacidad máxima de las referencias a 2 docs/s ni de los puntos cortos. La sostenibilidad exige los umbrales y ausencia de crecimiento de ambas colas durante la llegada de documentos, además de una prueba prolongada.
