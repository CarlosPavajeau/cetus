#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
if [[ -d /tmp/cetus-worker-comparison.lock ]]; then
  echo "Another worker comparison is running" >&2
  exit 1
fi
mkdir -p bench/results/build-timing
export BENCH_OTEL_DISABLED=false
export BENCH_TRACE_RATIO=1.0
export BENCH_OTLP_ENDPOINT=http://build-span-sink:4318
export DURATION_POINT=${DURATION_POINT:-30s}
docker compose -f bench/docker-compose.yml --profile timing up -d --no-build --force-recreate build-span-sink
bench/worker-comparison.sh large
index=$(node --input-type=module -e 'import fs from "node:fs"; console.log(fs.readdirSync("bench/results").filter(x=>/^worker-large-.*[.]tsv$/.test(x)).sort().at(-1))')
sleep 10
node bench/lib/build-summary.mjs "bench/results/$index" bench/results/build-timing/build-spans.csv
