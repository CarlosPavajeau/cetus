#!/usr/bin/env bash
# Runs bench/baseline.sh for several variants, each on a stack rebuilt from scratch (down -v, up, seed), so
# every variant sees the same data and a fresh LocalStack. A variant is label:tag:JAVA_OPTS, where tag names
# images built beforehand as cetus-bench-api:<tag> and cetus-bench-worker:<tag>:
#
#   docker build -f apps/api/Dockerfile -t cetus-bench-api:java21 .     (and the worker, from each checkout)
#   bench/compare.sh "java21:java21:-XX:MaxRAMPercentage=75" "java25:java25:-XX:MaxRAMPercentage=40"
#
# About an hour per variant; BASELINE_STEPS runs only some steps (see bench/baseline.sh), e.g.
# BASELINE_STEPS="coldstart coldstart steady". Keep the Mac on AC power with the lid open.
set -uo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
[ $# -gt 0 ] || {
  sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}
for variant in "$@"; do
  IFS=: read -r label tag opts <<<"$variant"
  echo "== $label: images :$tag, JAVA_OPTS=$opts ($(date +%H:%M))"
  [ -f bench/results/baseline-index.txt ] && sed -i.bak "/^$label /d" bench/results/baseline-index.txt
  export BENCH_JAVA_OPTS=$opts
  bench/bench.sh down -v >/dev/null 2>&1
  bench/bench.sh up >/dev/null 2>&1 || { echo "== $label: bench.sh up failed"; continue; }
  # The images under test take the place of :latest, and the services are recreated on them.
  docker tag "cetus-bench-api:$tag" cetus-bench-api:latest
  docker tag "cetus-bench-worker:$tag" cetus-bench-worker:latest
  docker compose -f bench/docker-compose.yml up -d --no-build --wait api worker >/dev/null 2>&1
  docker exec cetus-bench-api-1 sh -c 'java -version 2>&1 | head -1'
  bench/bench.sh seed >/dev/null 2>&1 || { echo "== $label: bench.sh seed failed"; continue; }
  # shellcheck disable=SC2086 # BASELINE_STEPS is a list of words.
  bench/baseline.sh "$label" ${BASELINE_STEPS:-}
done
echo "== compare done ($(date +%H:%M)); measurements in bench/results/baseline-index.txt"
